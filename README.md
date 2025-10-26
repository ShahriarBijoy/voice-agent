# Voice Agent Application

A modern voice-enabled conversational AI application built with FastAPI backend and Next.js frontend, featuring real-time voice interaction, speech-to-text, text-to-speech, and AI-powered responses.

## 🚀 Features

- **Real-time Voice Interaction**: Seamless voice-to-voice conversations
- **Speech-to-Text (STT)**: Convert spoken words to text using advanced AI
- **Text-to-Speech (TTS)**: Natural-sounding voice responses
- **WebSocket Communication**: Real-time bidirectional communication
- **Modern UI**: Built with Next.js, React, and Tailwind CSS
- **Responsive Design**: Mobile-first approach with beautiful animations
- **AI-Powered Responses**: Intelligent conversation handling with OpenAI integration

## 🏗️ Architecture

The application consists of two main components:

### Backend (`voice-agent-app/backend/`)
- **FastAPI**: Modern Python web framework
- **WebSocket Support**: Real-time communication
- **OpenAI Integration**: AI-powered conversation handling
- **Modular Services**: STT, TTS, and LLM services

### Frontend (`voice-agent-app/voice-agent/`)
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Smooth animations

## 📋 Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn
- OpenAI API key

## 🛠️ Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd voice-agent-app/backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the backend directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

6. Run the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd voice-agent-app/voice-agent
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3006`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### API Endpoints

The backend provides the following endpoints:

- `GET /`: Health check
- `WebSocket /ws`: Real-time voice communication
- `POST /conversation`: Start a new conversation
- `GET /conversation/{id}`: Get conversation history

## 🎯 Usage

1. Start both the backend and frontend servers
2. Open your browser and navigate to `http://localhost:3006`
3. Allow microphone permissions when prompted
4. Click the voice button to start a conversation
5. Speak naturally and receive AI-powered voice responses

## 📁 Project Structure

```
voice-agent-app/
├── backend/
│   ├── config.py              # Configuration settings
│   ├── main.py                # FastAPI application entry point
│   ├── websocket_handler.py   # WebSocket connection handling
│   ├── models/
│   │   └── conversation.py    # Conversation data models
│   ├── services/
│   │   ├── llm_service.py     # AI/LLM service
│   │   ├── stt_service.py     # Speech-to-text service
│   │   └── tts_service.py     # Text-to-speech service
│   └── utils/
│       └── prompt_templates.py # AI prompt templates
└── voice-agent/
    ├── app/                   # Next.js app directory
    ├── components/           # React components
    ├── lib/                  # Utility functions
    └── hooks/                # Custom React hooks
```

## 🚀 Deployment

### Backend Deployment

1. Set up environment variables on your hosting platform
2. Install dependencies: `pip install -r requirements.txt`
3. Run with: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Frontend Deployment

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Or deploy to platforms like Vercel, Netlify, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Contact the maintainers

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Voice cloning capabilities
- [ ] Conversation history persistence
- [ ] User authentication
- [ ] Mobile app development
- [ ] Advanced AI model integration

---

Built with ❤️ using FastAPI, Next.js, and modern web technologies.
