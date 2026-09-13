export async function runAIMatching(supabase, itemType, itemId) {
    if (!supabase) {
        throw new Error("Supabase client is required");
    }

    if (!itemType) {
        throw new Error("Item type is required");
    }

    if (!itemId) {
        throw new Error("Item ID is required");
    }

    const { data, error } = await supabase.functions.invoke("match-item", {
        body: {
            itemType,
            itemId,
        },
    });

    if (error) {
        throw error;
    }

    return data;
}

