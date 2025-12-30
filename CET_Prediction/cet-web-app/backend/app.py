from flask import Flask, request, jsonify
from flask_cors import CORS
from routes.predict_route import predict_bp
import pandas as pd
import os
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# SIMPLIFIED CORS CONFIGURATION - FIX FOR DUPLICATE HEADERS
CORS(app, 
     origins="http://localhost:5173",  # Single string, not list
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Try to import blueprints with error handling
try:
    from routes.college_directory import college_directory_bp
    COLLEGE_DIRECTORY_AVAILABLE = True
    logger.info("✅ College directory blueprint imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ College directory blueprint not available: {e}")
    COLLEGE_DIRECTORY_AVAILABLE = False
    college_directory_bp = None

try:
    from routes.chat_routes import chat_bp
    CHAT_ROUTES_AVAILABLE = True
    logger.info("✅ Chat routes blueprint imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ Chat routes blueprint not available: {e}")
    CHAT_ROUTES_AVAILABLE = False
    chat_bp = None

try:
    from routes.college_comparison_route import comparison_bp
    COMPARISON_AVAILABLE = True
    logger.info("✅ Comparison blueprint imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ Comparison blueprint not available: {e}")
    COMPARISON_AVAILABLE = False
    comparison_bp = None

# Register blueprints if available
try:
    app.register_blueprint(predict_bp)
    logger.info("✅ Prediction blueprint registered")
except Exception as e:
    logger.error(f"❌ Failed to register prediction blueprint: {e}")

if COLLEGE_DIRECTORY_AVAILABLE and college_directory_bp:
    app.register_blueprint(college_directory_bp, url_prefix='/api')
    logger.info("✅ College directory blueprint registered")
else:
    logger.warning("⚠️ College directory blueprint not registered")

if CHAT_ROUTES_AVAILABLE and chat_bp:
    app.register_blueprint(chat_bp, url_prefix='/api')
    logger.info("✅ Chat blueprint registered")
else:
    logger.warning("⚠️ Chat blueprint not registered")

if COMPARISON_AVAILABLE and comparison_bp:
    app.register_blueprint(comparison_bp, url_prefix='/api')
    logger.info("✅ Comparison blueprint registered")
else:
    logger.warning("⚠️ Comparison blueprint not registered")

@app.route('/', methods=['GET'])
def home():
    endpoints = {
        'health': 'GET /api/health',
        'model_info': 'GET /api/model-info',
        'predict': 'POST /api/predict',
        'colleges_dataset': 'GET /api/colleges/dataset',
        'college_directory': 'GET /api/colleges/directory',
        'filter_colleges': 'GET /api/colleges/filter',
        'college_details': 'GET /api/colleges/<code>/details',
        'college_stats': 'GET /api/colleges/stats',
        'predict_cutoff': 'POST /api/colleges/<code>/predict',
        'chat': 'POST /api/chat',
        'chat_clear': 'POST /api/chat/clear',
        'chat_status': 'GET /api/chat/status'
    }
    
    # ✅ ADD COMPARISON ENDPOINTS IF AVAILABLE
    if COMPARISON_AVAILABLE:
        endpoints.update({
            'compare_search': 'GET /api/compare/colleges?query=',
            'compare_branches': 'POST /api/compare/branches',
            'compare_compare': 'POST /api/compare/compare',
            'compare_health': 'GET /api/compare/health',
            'compare_test': 'GET /api/compare/test'
        })
    
    return jsonify({
        'message': '🎓 CET Predictor API',
        'status': 'running',
        'version': '1.0.0',
        'endpoints': endpoints,
        'services': {
            'comparison': COMPARISON_AVAILABLE,
            'college_directory': COLLEGE_DIRECTORY_AVAILABLE,
            'chat': CHAT_ROUTES_AVAILABLE,
            'prediction': True
        }
    })

@app.route('/api/health', methods=['GET'])
def health():
    # Check if chat service is working by trying to import
    gemini_available = False
    chat_available = False
    
    if CHAT_ROUTES_AVAILABLE:
        try:
            # First check if chat_routes module exists and has GEMINI_AVAILABLE
            from routes import chat_routes
            chat_available = True
            
            # Try to get GEMINI_AVAILABLE from the module
            if hasattr(chat_routes, 'GEMINI_AVAILABLE'):
                gemini_available = chat_routes.GEMINI_AVAILABLE
                logger.info(f"✅ Gemini available status: {gemini_available}")
            else:
                logger.warning("⚠️ GEMINI_AVAILABLE not found in chat_routes module")
                gemini_available = False
        except ImportError as e:
            logger.error(f"❌ Failed to import chat_routes module: {e}")
            chat_available = False
            gemini_available = False
        except Exception as e:
            logger.error(f"❌ Error checking chat service: {e}")
            chat_available = False
            gemini_available = False
    else:
        logger.info("ℹ️ Chat routes not available")
        chat_available = False
        gemini_available = False
    
    return jsonify({
        'status': 'healthy',
        'message': 'Backend server is operational',
        'services': {
            'comparison': COMPARISON_AVAILABLE,
            'college_directory': COLLEGE_DIRECTORY_AVAILABLE,
            'chat_routes': CHAT_ROUTES_AVAILABLE,
            'chat_available': chat_available,
            'gemini_ai': gemini_available,
            'prediction': True
        },
        'timestamp': pd.Timestamp.now().isoformat(),
        'cors_origin': 'http://localhost:5173'
    })

@app.route('/api/test-blueprint', methods=['GET'])
def test_blueprint():
    return jsonify({
        'success': True,
        'message': 'Blueprint is working',
        'services': {
            'comparison': COMPARISON_AVAILABLE,
            'college_directory': COLLEGE_DIRECTORY_AVAILABLE,
            'chat': CHAT_ROUTES_AVAILABLE
        },
        'endpoints': [
            '/api/colleges/directory',
            '/api/colleges/filter',
            '/api/colleges/stats',
            '/api/chat',
            '/api/chat/status',
            '/api/chat/clear'
        ]
    })

@app.route('/api/colleges/dataset', methods=['GET'])
def get_college_dataset():
    try:
        # Use forward slashes or raw string for Windows path
        file_path = 'backend/data/flattened_CAP_data done.xlsx'
        
        logger.info(f"📂 Looking for file at: {file_path}")
        logger.info(f"📁 Current working directory: {os.getcwd()}")
        logger.info(f"🔍 File exists: {os.path.exists(file_path)}")
        
        if not os.path.exists(file_path):
            # Try absolute path
            absolute_path = 'D:/CET_Prediction/cet-web-app/backend/data/flattened_CAP_data done.xlsx'
            if os.path.exists(absolute_path):
                file_path = absolute_path
                logger.info(f"✅ Found file at absolute path: {file_path}")
            else:
                return jsonify({
                    'success': False,
                    'error': f'Excel file not found at: {file_path}',
                    'current_directory': os.getcwd(),
                    'files_in_data_dir': os.listdir('backend/data') if os.path.exists('backend/data') else 'Directory not found'
                }), 404
        
        # Read the Excel file
        logger.info("📊 Reading Excel file...")
        df = pd.read_excel(file_path)
        
        # Basic data cleaning
        df = df.where(pd.notna(df), None)  # Replace NaN with None for JSON
        
        # Convert to JSON
        data = df.to_dict('records')
        
        logger.info(f"✅ Successfully loaded {len(data)} records")
        
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data),
            'columns': list(df.columns),
            'sample_size': min(5, len(data))
        })
        
    except Exception as e:
        logger.error(f"❌ Error loading dataset: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

# Add a specific endpoint for college directory stats
@app.route('/api/colleges/directory/stats', methods=['GET'])
def directory_stats():
    """Quick endpoint to check college directory status"""
    try:
        # Check if the Excel file exists
        dir_path = 'backend/data/Colleges_URL.xlsx'
        
        if not os.path.exists(dir_path):
            # Try absolute path
            dir_path = 'D:/CET_Prediction/cet-web-app/backend/data/Colleges_URL.xlsx'
            
            if not os.path.exists(dir_path):
                return jsonify({
                    'success': False,
                    'message': 'College directory file not found',
                    'expected_paths': [
                        'backend/data/Colleges_URL.xlsx',
                        'D:/CET_Prediction/cet-web-app/backend/data/Colleges_URL.xlsx'
                    ],
                    'files_in_data_dir': os.listdir('backend/data') if os.path.exists('backend/data') else []
                }), 404
        
        # Quick load to check file
        df = pd.read_excel(dir_path, nrows=5)
        
        return jsonify({
            'success': True,
            'message': 'College directory file is accessible',
            'file_path': dir_path,
            'columns': list(df.columns),
            'sample_count': len(df),
            'sample_data': df.head(3).to_dict('records')
        })
        
    except Exception as e:
        logger.error(f"Error in directory_stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'file_path': dir_path if 'dir_path' in locals() else 'Unknown'
        }), 500

# ✅ ADD DEBUG ENDPOINT FOR COMPARISON
@app.route('/api/debug/compare', methods=['GET'])
def debug_compare():
    """Debug endpoint to check comparison service"""
    return jsonify({
        'success': True,
        'comparison_available': COMPARISON_AVAILABLE,
        'test_endpoint': 'GET /api/compare/test' if COMPARISON_AVAILABLE else 'Not available',
        'health_endpoint': 'GET /api/compare/health' if COMPARISON_AVAILABLE else 'Not available',
        'compare_endpoint': 'POST /api/compare/compare' if COMPARISON_AVAILABLE else 'Not available'
    })

# Test CORS headers endpoint
@app.route('/api/cors-test', methods=['GET', 'OPTIONS'])
def cors_test():
    """Test CORS headers directly"""
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response, 200
    
    headers = dict(request.headers)
    
    return jsonify({
        'success': True,
        'message': 'CORS test endpoint',
        'request_headers': headers,
        'cors_info': {
            'allowed_origin': 'http://localhost:5173',
            'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allowed_headers': ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
        }
    })

# API documentation endpoint
@app.route('/api/docs', methods=['GET'])
def api_docs():
    """API documentation"""
    docs = {
        'chat_service': {
            'description': 'Google Gemini AI-powered college admission chatbot',
            'available': CHAT_ROUTES_AVAILABLE,
            'endpoints': {
                'chat': {
                    'method': 'POST',
                    'url': '/api/chat',
                    'body': {
                        'message': 'string (required)',
                        'history': 'array of previous messages (optional)'
                    },
                    'response': {
                        'response': 'string',
                        'success': 'boolean'
                    }
                },
                'chat_status': {
                    'method': 'GET',
                    'url': '/api/chat/status',
                    'response': {
                        'available': 'boolean',
                        'service': 'string'
                    }
                },
                'clear_chat': {
                    'method': 'POST',
                    'url': '/api/chat/clear',
                    'response': {
                        'message': 'string',
                        'success': 'boolean'
                    }
                }
            }
        },
        'prediction_service': {
            'endpoints': {
                'predict': 'POST /api/predict',
                'health': 'GET /api/health'
            }
        },
        'college_data': {
            'endpoints': {
                'dataset': 'GET /api/colleges/dataset',
                'directory': 'GET /api/colleges/directory',
                'filter': 'GET /api/colleges/filter'
            }
        }
    }
    
    if COMPARISON_AVAILABLE:
        docs['comparison_service'] = {
            'endpoints': {
                'search': 'GET /api/compare/colleges?query=',
                'compare': 'POST /api/compare/compare'
            }
        }
    
    return jsonify(docs)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': 'Check the API documentation at GET /',
        'available_endpoints': {
            'home': 'GET /',
            'health': 'GET /api/health',
            'docs': 'GET /api/docs',
            'chat_status': 'GET /api/chat/status'
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': 'Please check server logs'
    }), 500

# Print all registered routes for debugging
def print_registered_routes():
    print("\n" + "="*60)
    print("📋 REGISTERED ROUTES:")
    print("="*60)
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'OPTIONS', 'HEAD'}))
        print(f"  {rule.rule:50} -> {rule.endpoint:30} [{methods}]")
    print("="*60)

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 CET College Predictor - Backend Server")
    print("="*50)
    print("📍 Server: http://localhost:5000")
    print("🌐 Frontend: http://localhost:5173")
    print("🔧 CORS Origin: http://localhost:5173")
    print("📚 API Docs: http://localhost:5000/")
    print("🎓 Dataset Endpoint: GET /api/colleges/dataset")
    print("📚 College Directory: GET /api/colleges/directory")
    
    if CHAT_ROUTES_AVAILABLE:
        print("\n🤖 Chat Assistant:")
        print("   Status:      GET http://localhost:5000/api/chat/status")
        print("   Chat:        POST http://localhost:5000/api/chat")
        print("   Clear:       POST http://localhost:5000/api/chat/clear")
        print("   Test:        GET http://localhost:5000/api/chat/test")
    else:
        print("\n⚠️  Chat assistant routes not available")
        print("   Check if 'routes/chat_routes.py' exists")
    
    # ✅ ADD COMPARISON INFO
    if COMPARISON_AVAILABLE:
        print("\n🔍 Comparison Service:")
        print("   Test:        GET http://localhost:5000/api/compare/test")
        print("   Health:      GET http://localhost:5000/api/compare/health")
        print("   Search:      GET http://localhost:5000/api/compare/colleges?query=")
        print("   Compare:     POST http://localhost:5000/api/compare/compare")
    else:
        print("\n⚠️  Comparison service not available")
    
    print("\n📊 Services Status:")
    print(f"   • Comparison Service: {'✅' if COMPARISON_AVAILABLE else '❌'}")
    print(f"   • College Directory: {'✅' if COLLEGE_DIRECTORY_AVAILABLE else '❌'}")
    print(f"   • Chat Routes: {'✅' if CHAT_ROUTES_AVAILABLE else '❌'}")
    print(f"   • Prediction Model: ✅")
    
    print("="*50 + "\n")
    
    # Test if college directory file exists
    dir_path = 'backend/data/Colleges_URL.xlsx'
    abs_path = 'D:/CET_Prediction/cet-web-app/backend/data/Colleges_URL.xlsx'
    
    if os.path.exists(dir_path):
        logger.info(f"✅ College directory file found: {dir_path}")
    elif os.path.exists(abs_path):
        logger.info(f"✅ College directory file found (absolute): {abs_path}")
    else:
        logger.warning(f"⚠️  College directory file not found. Expected at:")
        logger.warning(f"   - {dir_path}")
        logger.warning(f"   - {abs_path}")
    
    # Print all registered routes
    print_registered_routes()
    
    # Test if chat service can be initialized
    if CHAT_ROUTES_AVAILABLE:
        try:
            from routes.chat_routes import GEMINI_AVAILABLE
            if GEMINI_AVAILABLE:
                logger.info("✅ Gemini chat service is configured and available")
            else:
                logger.warning("⚠️ Gemini service not configured (fallback mode active)")
                logger.warning("   To enable Gemini AI:")
                logger.warning("   1. Get API key from: https://makersuite.google.com/app/apikey")
                logger.warning("   2. Create .env file with GEMINI_API_KEY=your_key")
                logger.warning("   3. Install: pip install google-generativeai python-dotenv")
        except Exception as e:
            logger.error(f"❌ Error checking Gemini status: {e}")
    
    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=True)