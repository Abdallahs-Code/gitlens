Setup
	- install required packages (supabase.. )
	- create a supabase project with a (notes) table, columns ↓
		id           uuid   
		username     text
		repo_name    text
		content      text
		created_at   timestamp

	- create .env.local file in the root directory
		assign a PAT from github (GITHUB_TOKEN)
		assign an API key from gemini (GEMINI_API_KEY)
		assign supabase project URL (NEXT_PUBLIC_SUPABASE_URL)
		assign supabase anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
		assign the base url (NEXT_PUBLIC_API_URL)

Run
	- npm run dev

Notes
	- Technologies used are not optimal however the best for free usage

	