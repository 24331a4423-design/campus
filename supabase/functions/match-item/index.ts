import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ItemType = "lost" | "found";

interface ItemRecord {
    id: string;
    user_id: string;
    item_name: string;
    category: string;
    brand: string | null;
    color: string | null;
    description: string | null;
    location: string | null;
    date_lost?: string | null;
    time_lost?: string | null;
    date_found?: string | null;
    time_found?: string | null;
    status: string;
    image_url?: string | null;
}

interface AIMatchResult {
    match_score: number;
    similarities: string;
    differences: string;
    confidence: "Low" | "Medium" | "High" | "Very High";
    recommendation: string;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json"
};

function jsonResponse(
    body: Record<string, unknown>,
    status = 200
) {
    return new Response(JSON.stringify(body), {
        status,
        headers: jsonHeaders
    });
}

function normalize(value: unknown): string {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(value: unknown): Set<string> {
    const text = normalize(value);

    if (!text) {
        return new Set();
    }

    return new Set(
        text
            .split(" ")
            .filter((word) => word.length > 2)
    );
}

function similarity(
    first: unknown,
    second: unknown
): number {
    const a = tokenize(first);
    const b = tokenize(second);

    if (a.size === 0 || b.size === 0) {
        return 0;
    }

    let intersection = 0;

    for (const word of a) {
        if (b.has(word)) {
            intersection++;
        }
    }

    const union = new Set([...a, ...b]).size;

    if (union === 0) {
        return 0;
    }

    return intersection / union;
}

function heuristicMatch(
    lostItem: ItemRecord,
    foundItem: ItemRecord
): AIMatchResult {
    const categoryScore =
        similarity(lostItem.category, foundItem.category) * 18;

    const brandScore =
        similarity(lostItem.brand, foundItem.brand) * 18;

    const colorScore =
        similarity(lostItem.color, foundItem.color) * 12;

    const nameScore =
        similarity(lostItem.item_name, foundItem.item_name) * 20;

    const descriptionScore =
        similarity(lostItem.description, foundItem.description) * 22;

    const locationScore =
        similarity(lostItem.location, foundItem.location) * 10;

    const total = Math.round(
        categoryScore +
        brandScore +
        colorScore +
        nameScore +
        descriptionScore +
        locationScore
    );

    let confidence: AIMatchResult["confidence"] = "Low";

    if (total >= 85) {
        confidence = "Very High";
    } else if (total >= 70) {
        confidence = "High";
    } else if (total >= 50) {
        confidence = "Medium";
    }

    return {
        match_score: Math.min(100, Math.max(0, total)),
        similarities:
            "Similar category, item details, color, brand, description, or location.",
        differences:
            "Automated heuristic comparison; verify the physical item before claiming.",
        confidence,
        recommendation:
            total >= 50
                ? "Potential match. Review the item details and verify ownership."
                : "Low similarity. No strong match detected."
    };
}

function buildPrompt(
    lostItem: ItemRecord,
    foundItem: ItemRecord
): string {
    return `
You are an AI assistant for a campus lost-and-found system.

Compare the following LOST item with the FOUND item.

LOST ITEM:
Item name: ${lostItem.item_name}
Category: ${lostItem.category}
Brand: ${lostItem.brand ?? "Not provided"}
Color: ${lostItem.color ?? "Not provided"}
Description: ${lostItem.description ?? "Not provided"}
Location: ${lostItem.location ?? "Not provided"}
Date lost: ${lostItem.date_lost ?? "Not provided"}
Time lost: ${lostItem.time_lost ?? "Not provided"}

FOUND ITEM:
Item name: ${foundItem.item_name}
Category: ${foundItem.category}
Brand: ${foundItem.brand ?? "Not provided"}
Color: ${foundItem.color ?? "Not provided"}
Description: ${foundItem.description ?? "Not provided"}
Location: ${foundItem.location ?? "Not provided"}
Date found: ${foundItem.date_found ?? "Not provided"}
Time found: ${foundItem.time_found ?? "Not provided"}

Evaluate the likelihood that both reports describe the same physical item.

Consider:

* item name
* category
* brand
* color
* description
* location
* dates and times
* distinctive identifying details

Do not decide ownership with certainty.
This is only a recommendation for the user and administrator.

Return a JSON object with:

* match_score: integer from 0 to 100
* similarities: short semicolon-separated explanation
* differences: short semicolon-separated explanation
* confidence: exactly Low, Medium, High, or Very High
* recommendation: short recommendation
  `;
}

function sanitizeAIResult(
    value: unknown
): AIMatchResult | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const result = value as Record<string, unknown>;

    const score = Number(result.match_score);

    if (!Number.isFinite(score)) {
        return null;
    }

    const allowedConfidence = [
        "Low",
        "Medium",
        "High",
        "Very High"
    ];

    const confidence = allowedConfidence.includes(
        String(result.confidence)
    )
        ? (String(result.confidence) as AIMatchResult["confidence"])
        : "Low";

    return {
        match_score: Math.min(100, Math.max(0, Math.round(score))),
        similarities: String(
            result.similarities ?? ""
        ).slice(0, 1000),
        differences: String(
            result.differences ?? ""
        ).slice(0, 1000),
        confidence,
        recommendation: String(
            result.recommendation ?? ""
        ).slice(0, 1000)
    };
}

async function getGeminiMatch(
    lostItem: ItemRecord,
    foundItem: ItemRecord,
    apiKey: string,
    model: string
): Promise<AIMatchResult | null> {
    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: buildPrompt(lostItem, foundItem)
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        match_score: {
                            type: "INTEGER"
                        },
                        similarities: {
                            type: "STRING"
                        },
                        differences: {
                            type: "STRING"
                        },
                        confidence: {
                            type: "STRING",
                            enum: [
                                "Low",
                                "Medium",
                                "High",
                                "Very High"
                            ]
                        },
                        recommendation: {
                            type: "STRING"
                        }
                    },
                    required: [
                        "match_score",
                        "similarities",
                        "differences",
                        "confidence",
                        "recommendation"
                    ]
                }
            }
        })
    });

    if (!response.ok) {
        console.error(
            "Gemini request failed:",
            await response.text()
        );


        return null;


    }

    const data = await response.json();

    const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        return null;
    }

    try {
        const parsed = JSON.parse(text);


        return sanitizeAIResult(parsed);


    } catch (error) {
        console.error(
            "Failed to parse Gemini response:",
            error
        );


        return null;


    }
}

async function verifyItemOwnership(
    supabase: ReturnType<typeof createClient>,
    itemType: ItemType,
    itemId: string,
    userId: string
): Promise<ItemRecord | null> {
    const table =
        itemType === "lost"
            ? "lost_items"
            : "found_items";

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", itemId)
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        return null;
    }

    return data as ItemRecord;
}

async function findOppositeItems(
    supabase: ReturnType<typeof createClient>,
    itemType: ItemType,
    userId: string
): Promise<ItemRecord[]> {
    const table =
        itemType === "lost"
            ? "found_items"
            : "lost_items";

    const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(
            "status",
            itemType === "lost"
                ? "found"
                : "lost"
        )
        .neq("user_id", userId)
        .order(
            itemType === "lost"
                ? "date_found"
                : "date_lost",
            { ascending: false }
        )
        .limit(50);

    if (error) {
        throw error;
    }

    return (data ?? []) as ItemRecord[];
}

async function saveMatch(
    supabase: ReturnType<typeof createClient>,
    lostItemId: string,
    foundItemId: string,
    result: AIMatchResult
) {
    const { error } = await supabase
        .from("ai_matches")
        .upsert(
            {
                lost_item_id: lostItemId,
                found_item_id: foundItemId,
                match_score: result.match_score,
                similarities: result.similarities,
                differences: result.differences,
                confidence: result.confidence,
                recommendation: result.recommendation,
                status: "pending"
            },
            {
                onConflict:
                    "lost_item_id,found_item_id"
            }
        );

    if (error) {
        throw error;
    }
}

async function createNotifications(
    supabase: ReturnType<typeof createClient>,
    lostItem: ItemRecord,
    foundItem: ItemRecord,
    result: AIMatchResult
) {
    const message =
        `Potential match found with ${result.match_score}% similarity. ` +
        `Please review the suggested match before requesting a claim.`;

    const notifications = [
        {
            user_id: lostItem.user_id,
            title: "Potential Match Found",
            message,
            type: "ai_match",
            read: false
        },
        {
            user_id: foundItem.user_id,
            title: "Potential Match Found",
            message,
            type: "ai_match",
            read: false
        }
    ];

    const { error } = await supabase
        .from("notifications")
        .insert(notifications);

    if (error) {
        console.error(
            "Notification creation failed:",
            error
        );
    }
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders
        });
    }

    if (req.method !== "POST") {
        return jsonResponse(
            {
                error: "Only POST requests are allowed."
            },
            405
        );
    }

    try {
        const supabaseUrl =
            Deno.env.get("SUPABASE_URL");

        const supabaseAnonKey =
            Deno.env.get("SUPABASE_ANON_KEY");

        const serviceRoleKey =
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        const geminiApiKey =
            Deno.env.get("GEMINI_API_KEY");

        const geminiModel =
            Deno.env.get("GEMINI_MODEL") ||
            "gemini-2.5-flash";

        if (
            !supabaseUrl ||
            !supabaseAnonKey ||
            !serviceRoleKey
        ) {
            return jsonResponse(
                {
                    error:
                        "Supabase environment variables are missing."
                },
                500
            );
        }

        const authHeader =
            req.headers.get("Authorization");

        if (!authHeader) {
            return jsonResponse(
                {
                    error: "Missing authorization header."
                },
                401
            );
        }

        const userClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                global: {
                    headers: {
                        Authorization: authHeader
                    }
                }
            }
        );

        const {
            data: {
                user
            },
            error: userError
        } = await userClient.auth.getUser();

        if (userError || !user) {
            return jsonResponse(
                {
                    error: "Unauthorized."
                },
                401
            );
        }

        const body = await req.json();

        const itemType =
            body?.itemType as ItemType;

        const itemId =
            body?.itemId as string;

        if (
            itemType !== "lost" &&
            itemType !== "found"
        ) {
            return jsonResponse(
                {
                    error:
                        "itemType must be 'lost' or 'found'."
                },
                400
            );
        }

        if (!itemId) {
            return jsonResponse(
                {
                    error: "itemId is required."
                },
                400
            );
        }

        const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        const submittedItem =
            await verifyItemOwnership(
                adminClient,
                itemType,
                itemId,
                user.id
            );

        if (!submittedItem) {
            return jsonResponse(
                {
                    error:
                        "Item not found or you do not own this item."
                },
                403
            );
        }

        const oppositeItems =
            await findOppositeItems(
                adminClient,
                itemType,
                user.id
            );

        let matchesCreated = 0;
        let matchesSkipped = 0;
        const errors: string[] = [];

        for (const oppositeItem of oppositeItems) {
            const lostItem =
                itemType === "lost"
                    ? submittedItem
                    : oppositeItem;

            const foundItem =
                itemType === "found"
                    ? submittedItem
                    : oppositeItem;

            let result: AIMatchResult | null = null;

            if (geminiApiKey) {
                result = await getGeminiMatch(
                    lostItem,
                    foundItem,
                    geminiApiKey,
                    geminiModel
                );
            }

            if (!result) {
                result = heuristicMatch(
                    lostItem,
                    foundItem
                );
            }

            if (result.match_score < 50) {
                matchesSkipped++;
                continue;
            }

            try {
                await saveMatch(
                    adminClient,
                    lostItem.id,
                    foundItem.id,
                    result
                );

                await createNotifications(
                    adminClient,
                    lostItem,
                    foundItem,
                    result
                );

                matchesCreated++;
            } catch (matchError) {
                console.error(
                    "Failed to save match:",
                    matchError
                );

                errors.push(
                    matchError instanceof Error
                        ? matchError.message
                        : String(matchError)
                );
            }
        }

        return jsonResponse({
            success: true,
            itemType,
            itemId,
            candidatesChecked: oppositeItems.length,
            matchesCreated,
            matchesSkipped,
            errors
        });

    } catch (error) {
        console.error(
            "match-item function error:",
            error
        );

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unexpected server error."
            },
            500
        );

    }
});