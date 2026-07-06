-- Campus Guardian Database Schema
-- Paste this script into your Supabase SQL Editor to set up the tables, triggers, and Row Level Security (RLS) policies.

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Profiles Table (Linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  register_number text not null,
  department text not null,
  year text not null,
  email text not null,
  phone text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default now()
);

-- 3. Create Lost Items Table
create table public.lost_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_name text not null,
  category text not null,
  brand text,
  color text,
  description text not null,
  image_url text, -- Store the relative path in the storage bucket (e.g. 'lost/filename.jpg')
  location text not null,
  date_lost date not null,
  time_lost time not null,
  contact text not null,
  status text not null default 'lost' check (status in ('lost', 'claimed', 'resolved')),
  created_at timestamp with time zone default now()
);

-- 4. Create Found Items Table
create table public.found_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_name text not null,
  category text not null,
  brand text,
  color text,
  description text not null,
  image_url text, -- Store the relative path in the storage bucket (e.g. 'found/filename.jpg')
  location text not null,
  date_found date not null,
  time_found time not null,
  contact text not null,
  status text not null default 'found' check (status in ('found', 'claimed', 'resolved')),
  created_at timestamp with time zone default now()
);

-- 5. Create AI Matches Table
create table public.ai_matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid references public.lost_items(id) on delete cascade not null,
  found_item_id uuid references public.found_items(id) on delete cascade not null,
  match_score integer not null,
  similarities text,
  differences text,
  confidence text,
  recommendation text,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'dismissed')),
  created_at timestamp with time zone default now(),
  constraint unique_match unique (lost_item_id, found_item_id)
);

-- 6. Create Claims Table
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid references public.lost_items(id) on delete cascade not null,
  found_item_id uuid references public.found_items(id) on delete cascade not null,
  claimant_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_remark text,
  created_at timestamp with time zone default now()
);

-- 7. Create Notifications Table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone default now()
);

-- 8. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.lost_items enable row level security;
alter table public.found_items enable row level security;
alter table public.ai_matches enable row level security;
alter table public.claims enable row level security;
alter table public.notifications enable row level security;

-- 9. Helper Function to Check if User is Admin
create or replace function public.is_admin()
returns boolean security definer set search_path = public as $$
begin
  return coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
end;
$$ language plpgsql;

-- 10. RLS Policies

-- Profiles Policies
create policy "Allow profiles read" on public.profiles for select using (true);
create policy "Allow user profile updates" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- Lost Items Policies
create policy "Allow select lost items" on public.lost_items for select using (true);
create policy "Allow insert lost items" on public.lost_items for insert with check (auth.uid() = user_id);
create policy "Allow update lost items" on public.lost_items for update using (auth.uid() = user_id or public.is_admin());
create policy "Allow delete lost items" on public.lost_items for delete using (auth.uid() = user_id or public.is_admin());

-- Found Items Policies
create policy "Allow select found items" on public.found_items for select using (true);
create policy "Allow insert found items" on public.found_items for insert with check (auth.uid() = user_id);
create policy "Allow update found items" on public.found_items for update using (auth.uid() = user_id or public.is_admin());
create policy "Allow delete found items" on public.found_items for delete using (auth.uid() = user_id or public.is_admin());

-- AI Matches Policies
create policy "Allow select ai matches" on public.ai_matches for select using (
  public.is_admin() or 
  auth.uid() in (select user_id from public.lost_items where id = lost_item_id) or
  auth.uid() in (select user_id from public.found_items where id = found_item_id)
);
create policy "Allow insert/update ai matches" on public.ai_matches for all using (true);

-- Claims Policies
create policy "Allow select claims" on public.claims for select using (
  auth.uid() = claimant_id or 
  public.is_admin() or
  auth.uid() in (select user_id from public.found_items where id = found_item_id)
);
create policy "Allow insert claims" on public.claims for insert with check (auth.uid() = claimant_id);
create policy "Allow update claims" on public.claims for update using (public.is_admin());

-- Notifications Policies
create policy "Allow select notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Allow update notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Allow insert notifications" on public.notifications for insert with check (true);

-- 11. Profile Sync Trigger: Create a profile entry when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, register_number, department, year, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student User'),
    coalesce(new.raw_user_meta_data->>'register_number', 'N/A'),
    coalesce(new.raw_user_meta_data->>'department', 'N/A'),
    coalesce(new.raw_user_meta_data->>'year', 'N/A'),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', 'N/A'),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 12. Supabase Storage Policies for 'item-images' Bucket
-- Run this block to automatically seed the 'item-images' bucket and configure its RLS policies.

-- Create the bucket programmatically if it does not exist
insert into storage.buckets (id, name, public) 
values ('item-images', 'item-images', false)
on conflict (id) do nothing;

-- select/read policy
create policy "Allow authenticated select" 
on storage.objects for select 
using (bucket_id = 'item-images' and auth.role() = 'authenticated');

-- insert/upload policy
create policy "Allow authenticated insert" 
on storage.objects for insert 
with check (bucket_id = 'item-images' and auth.role() = 'authenticated');

-- update policy
create policy "Allow owners or admins to update" 
on storage.objects for update 
using (bucket_id = 'item-images' and (auth.uid() = owner or public.is_admin()));

-- delete policy
create policy "Allow owners or admins to delete" 
on storage.objects for delete 
using (bucket_id = 'item-images' and (auth.uid() = owner or public.is_admin()));

