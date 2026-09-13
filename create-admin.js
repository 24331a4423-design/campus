import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  const email = 'admin@example.com';
  const password = 'AdminPassword123!';

  console.log(`Attempting to create admin account: ${email}...`);

  // 1. Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: 'System Admin',
        role: 'admin',
        register_number: 'ADMIN-01',
        department: 'Administration',
        year: 'Staff',
        phone: '1234567890'
      }
    }
  });

  if (error) {
    if (error.message.includes('User already registered')) {
        console.log(`\nAccount already exists! We will just update it to admin.`);
    } else {
        console.error("Error creating user:", error.message);
        return;
    }
  } else {
      console.log(`\nSuccessfully registered user in Supabase Auth!`);
  }

  // 2. We don't have the service_role key to bypass RLS, so we will instruct the user to run the SQL query
  console.log(`\n=================================================`);
  console.log(`Account created! Here are your credentials:`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`=================================================\n`);
  
  console.log(`IMPORTANT LAST STEP:`);
  console.log(`Go to your Supabase SQL Editor and run this exact command to grant Admin rights:`);
  console.log(`\nUPDATE public.profiles SET role = 'admin' WHERE email = '${email}';\n`);
}

createAdmin();
