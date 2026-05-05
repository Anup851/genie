# Genie AI Chatbot

Genie is a web-based AI chatbot with chat history, media upload support, image generation mode, memory features, and a responsive interface for desktop and mobile.

## Features

- Real-time AI chat experience with animated assistant replies
- Rich thinking/loading state for slower responses
- Chat history with session persistence
- Image upload and media analysis flow powered by ParseKit
- PDF and text document context support
- Image generation mode from text prompts
- Voice input support
- Light and dark theme support
- Responsive UI for mobile and desktop
- Supabase-based authentication/session handling

## Technologies Used

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express
- Authentication and session client: Supabase JavaScript SDK
- AI orchestration/utilities: LangChain, custom prompt/chat services
- Storage/data utilities: `@replit/database`, local JSON data files
- File and environment handling: `dotenv`, `node-fetch`, `cors`
- UI libraries/CDNs: Prism.js, Google Fonts, Material Symbols, Material Icons, pdf.js

## Project Structure

```text
.
|- index.html
|- style.css
|- script.js
|- server.js
|- services/
|- utils/
|- data/
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file and add the required API keys and config.

3. Start the server:

```bash
npm start
```

4. Open `index.html` through your preferred local setup or run the app the way this project is currently served in your environment.

## Main Dependencies

```json
{
  "express": "^5.1.0",
  "@supabase/supabase-js": "^2.93.3",
  "langchain": "^0.3.0",
  "@langchain/core": "^0.3.0",
  "@replit/database": "^2.0.5",
  "dotenv": "^17.2.1",
  "cors": "^2.8.5",
  "node-fetch": "^2.7.0"
}
```

## Notes

- The frontend uses CDN-delivered Prism.js and pdf.js.
- Authentication is wired through Supabase in the client.
- Media/PDF analysis requires `PARSEKIT_API_KEY` on the backend. The app sends supported uploads to `https://api.parsekit.ai/api/v1/analyze` by default.
- Some features depend on backend API routes and environment variables being configured correctly.
