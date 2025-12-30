from flask import Blueprint, request, jsonify
import logging

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__)

# Initialize variables FIRST (important for imports)
GEMINI_AVAILABLE = False
chat_service = None

# Try to import Gemini service, but handle gracefully if not available
try:
    from services.gemini_service import GeminiChatService
    chat_service = GeminiChatService()
    GEMINI_AVAILABLE = True
    logger.info("✅ Gemini chat service loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import Gemini service: {e}")
    logger.error("Make sure to install: pip install google-generativeai python-dotenv")
    GEMINI_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Failed to initialize Gemini service: {e}")
    logger.error("Check your GEMINI_API_KEY in .env file")
    GEMINI_AVAILABLE = False

@chat_bp.route('/chat', methods=['GET', 'OPTIONS'])
def chat_options():
    """Handle OPTIONS for CORS preflight and provide endpoint info"""
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response, 200
    
    # GET request returns endpoint info
    return jsonify({
        'status': 'chat_service',
        'available': GEMINI_AVAILABLE,
        'message': 'Chat service endpoint',
        'methods': ['POST', 'OPTIONS', 'GET'],
        'endpoints': {
            'chat': 'POST /api/chat',
            'status': 'GET /api/chat/status',
            'clear': 'POST /api/chat/clear'
        },
        'gemini_configured': GEMINI_AVAILABLE
    })

@chat_bp.route('/chat', methods=['POST'])
def chat():
    try:
        # Check if Gemini service is available
        if not GEMINI_AVAILABLE or not chat_service:
            # Provide fallback responses for testing
            fallback_responses = [
                "I'd love to help with your college admission questions! Currently, I'm learning about Maharashtra CET colleges. What would you like to know about?",
                "As a college admission assistant, I specialize in CET-based engineering admissions in Maharashtra. You can ask me about cutoff trends, college rankings, or admission procedures.",
                "For CET admissions, you might want to know about top colleges like COEP Pune, VJTI Mumbai, or SPIT Mumbai. What specific information are you looking for?",
                "I can help you with information about CET cutoffs, college facilities, admission procedures, and branch-wise comparisons. What's your question about college admissions?",
                "Many students ask about Computer Engineering, IT, or Mechanical Engineering cutoffs in Mumbai and Pune colleges. What's your area of interest?"
            ]
            
            import random
            return jsonify({
                'response': random.choice(fallback_responses),
                'success': True,
                'service': 'fallback',
                'note': 'Gemini AI service is not configured. Using fallback responses.',
                'setup_required': True,
                'setup_steps': [
                    'Install: pip install google-generativeai python-dotenv',
                    'Create .env file with GEMINI_API_KEY=your_key',
                    'Get API key from: https://makersuite.google.com/app/apikey'
                ]
            })
        
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        user_message = data.get('message', '').strip()
        chat_history = data.get('history', [])
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        logger.info(f"Processing chat message: {user_message[:50]}...")
        
        # Process with Gemini
        response_text = chat_service.get_response(user_message, chat_history)
        
        return jsonify({
            'response': response_text,
            'success': True,
            'service': 'gemini_ai',
            'gemini_available': GEMINI_AVAILABLE
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        
        # Provide helpful error message
        error_message = "I apologize, but I encountered an error processing your request."
        
        if "API key" in str(e) or "authentication" in str(e).lower():
            error_message += " It appears there's an issue with the Gemini API configuration."
        elif "timeout" in str(e).lower():
            error_message += " The request timed out. Please try again."
        
        return jsonify({
            'success': False,
            'error': str(e),
            'response': error_message,
            'message': 'Error processing chat request'
        }), 500

@chat_bp.route('/chat/status', methods=['GET'])
def chat_status():
    """Check chat service status"""
    return jsonify({
        'success': True,
        'available': GEMINI_AVAILABLE,
        'service': 'gemini_ai' if GEMINI_AVAILABLE else 'fallback',
        'message': 'Chat service status',
        'requires_setup': not GEMINI_AVAILABLE,
        'setup_instructions': [
            '1. Get Gemini API key from: https://makersuite.google.com/app/apikey',
            '2. Create .env file in backend folder with: GEMINI_API_KEY=your_key_here',
            '3. Install: pip install google-generativeai python-dotenv',
            '4. Restart the backend server'
        ] if not GEMINI_AVAILABLE else None,
        'endpoints': {
            'chat': 'POST /api/chat',
            'status': 'GET /api/chat/status',
            'clear': 'POST /api/chat/clear'
        }
    })

@chat_bp.route('/chat/test', methods=['GET'])
def test_chat():
    """Test endpoint to verify chat service works"""
    try:
        if GEMINI_AVAILABLE and chat_service:
            test_response = chat_service.get_response("Hello, can you introduce yourself as a college admission assistant?")
            return jsonify({
                'success': True,
                'available': True,
                'test_passed': True,
                'response_sample': test_response[:100] + "..." if len(test_response) > 100 else test_response,
                'message': 'Gemini chat service is working correctly'
            })
        else:
            return jsonify({
                'success': True,
                'available': False,
                'test_passed': False,
                'message': 'Gemini service not configured',
                'fallback_available': True,
                'note': 'Chat will use fallback responses'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'available': False,
            'test_passed': False,
            'error': str(e),
            'message': 'Chat service test failed'
        })

@chat_bp.route('/chat/clear', methods=['POST', 'OPTIONS'])
def clear_chat():
    """Clear chat history (placeholder for future implementation)"""
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200
    
    return jsonify({
        'success': True,
        'message': 'Chat cleared (Note: History is not currently persisted)'
    })