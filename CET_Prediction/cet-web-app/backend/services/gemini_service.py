import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

class GeminiChatService:
    def __init__(self):
        try:
            load_dotenv()
            api_key = os.getenv('GEMINI_API_KEY')
            
            if not api_key:
                logger.error("❌ GEMINI_API_KEY not found in environment variables")
                logger.error("Create .env file with: GEMINI_API_KEY=your_key_here")
                raise ValueError("GEMINI_API_KEY not found")
            
            logger.info(f"🔑 API Key loaded (first 10 chars): {api_key[:10]}...")
            
            # Configure Gemini
            genai.configure(api_key=api_key)
            
            # Test the configuration
            try:
                models = list(genai.list_models())
                available_models = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
                logger.info(f"✅ Gemini configured. Available models: {len(available_models)}")
                
                # Log some available models
                for model_name in available_models[:5]:  # First 5 models
                    logger.info(f"  - {model_name}")
                    
            except Exception as e:
                logger.error(f"❌ Failed to list models: {e}")
                raise
            
            # Try different model names - use the latest available
            model_names_to_try = [
                "gemini-2.0-flash",        # Latest flash model
                "gemini-2.0-flash-001",    # Stable version
                "gemini-2.0-flash-lite",   # Lite version
                "gemini-pro-latest",       # Pro version
                "gemini-1.5-flash",        # Older but reliable
                "gemini-1.5-pro",          # Pro version
            ]
            
            selected_model = None
            
            for model_name in model_names_to_try:
                full_model_name = f"models/{model_name}"
                if full_model_name in available_models:
                    selected_model = full_model_name
                    logger.info(f"✅ Selected model: {selected_model}")
                    break
            
            if not selected_model:
                # Fallback to any available model
                if available_models:
                    selected_model = available_models[0]
                    logger.warning(f"⚠️ Using fallback model: {selected_model}")
                else:
                    raise ValueError("No suitable models available")
            
            logger.info(f"📦 Using model: {selected_model}")
            
            # Configure generation settings
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "max_output_tokens": 1024,
            }
            
            # Safety settings
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
            
            # System instruction for college admissions
            system_instruction = """You are a helpful college admission counselor for CET (MHT-CET) in Maharashtra, India. 
            Provide accurate, helpful information about:
            - Colleges accepting CET percentile
            - Cutoff scores for different branches
            - Admission procedures
            - College rankings and facilities
            - Placement statistics
            - Fees structure
            
            Be specific to Maharashtra engineering colleges.
            If you don't know something, say so politely.
            Keep responses concise and helpful."""
            
            self.model = genai.GenerativeModel(
                model_name=selected_model,
                generation_config=generation_config,
                safety_settings=safety_settings,
                system_instruction=system_instruction
            )
            
            # Test the model with a simple query
            try:
                test_response = self.model.generate_content("Hello, are you ready to help with college admissions?")
                logger.info(f"✅ Gemini service initialized. Test response: {test_response.text[:50]}...")
            except Exception as e:
                logger.error(f"❌ Model test failed: {e}")
                raise
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini service: {e}")
            raise
    
    def get_response(self, user_message, chat_history=None):
        try:
            logger.info(f"📝 Processing message: {user_message[:50]}...")
            
            # Prepare prompt with context
            prompt = user_message
            
            if chat_history and len(chat_history) > 0:
                # Build context from history
                context = "Previous conversation:\n"
                for msg in chat_history[-3:]:  # Last 3 exchanges
                    if 'user' in msg and msg['user']:
                        context += f"Student: {msg['user']}\n"
                    if 'bot' in msg and msg['bot']:
                        context += f"Assistant: {msg['bot']}\n"
                
                prompt = f"{context}\nCurrent question: {user_message}"
            
            # Get response
            response = self.model.generate_content(prompt)
            
            # Clean response
            response_text = response.text.strip()
            
            logger.info(f"✅ Response generated ({len(response_text)} chars)")
            return response_text
            
        except Exception as e:
            logger.error(f"❌ Error generating response: {e}")
            
            # Provide helpful error message
            error_msg = str(e).lower()
            
            if "quota" in error_msg or "rate limit" in error_msg:
                return "I apologize, but the service is currently experiencing high demand. Please try again in a few moments."
            elif "safety" in error_msg or "blocked" in error_msg:
                return "I cannot provide a response to that question due to content safety policies. Please ask about college admissions in Maharashtra."
            elif "api key" in error_msg or "authentication" in error_msg:
                return "There seems to be an authentication issue with the AI service. Please contact the administrator."
            elif "not found" in error_msg:
                return "The AI model is currently unavailable. Please try again later."
            else:
                return "I'm having trouble processing your request. Please try rephrasing your question about college admissions."

if __name__ == "__main__":
    print("🧪 Testing Gemini service...")
    try:
        service = GeminiChatService()
        
        test_questions = [
            "Which colleges accept CET percentile?",
            "What are the top engineering colleges in Mumbai?",
            "Can you tell me about COEP Pune?"
        ]
        
        for question in test_questions:
            print(f"\n❓ Question: {question}")
            response = service.get_response(question)
            print(f"✅ Response: {response[:150]}...")
            print("-" * 80)
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()