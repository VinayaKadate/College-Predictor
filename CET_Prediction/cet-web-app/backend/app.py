from flask import Flask, request, jsonify
from flask_cors import CORS
from routes.predict_route import predict_bp
import pandas as pd
import os
from routes.college_directory import college_directory_bp 

# ✅ ADD THIS IMPORT
try:
    from routes.college_comparison_route import comparison_bp
    COMPARISON_AVAILABLE = True
    print("✅ Comparison blueprint imported successfully")
except ImportError as e:
    print(f"⚠️ Comparison blueprint not available: {e}")
    COMPARISON_AVAILABLE = False
    comparison_bp = None

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(predict_bp)
app.register_blueprint(college_directory_bp, url_prefix='/api')

# ✅ ADD COMPARISON BLUEPRINT REGISTRATION
if COMPARISON_AVAILABLE and comparison_bp:
    app.register_blueprint(comparison_bp)
    print("✅ Comparison blueprint registered")
else:
    print("⚠️ Comparison blueprint not registered")

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
        'predict_cutoff': 'POST /api/colleges/<code>/predict'
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
        'comparison_available': COMPARISON_AVAILABLE
    })

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'message': 'Backend server is operational',
        'comparison_available': COMPARISON_AVAILABLE
    })

@app.route('/api/test-blueprint', methods=['GET'])
def test_blueprint():
    return jsonify({
        'success': True,
        'message': 'Blueprint is working',
        'comparison_available': COMPARISON_AVAILABLE,
        'endpoints': [
            '/api/colleges/directory',
            '/api/colleges/filter',
            '/api/colleges/stats'
        ]
    })

@app.route('/api/colleges/dataset', methods=['GET'])
def get_college_dataset():
    try:
        # Use forward slashes or raw string for Windows path
        file_path = 'backend/data/flattened_CAP_data done.xlsx'
        
        # Alternative: Use raw string for Windows path
        # file_path = r'backend\data\flattened_CAP_data done.xlsx'
        
        print(f"📂 Looking for file at: {file_path}")
        print(f"📁 Current working directory: {os.getcwd()}")
        print(f"🔍 File exists: {os.path.exists(file_path)}")
        
        if not os.path.exists(file_path):
            # Try absolute path
            absolute_path = 'D:/CET_Prediction/cet-web-app/backend/data/flattened_CAP_data done.xlsx'
            if os.path.exists(absolute_path):
                file_path = absolute_path
                print(f"✅ Found file at absolute path: {file_path}")
            else:
                return jsonify({
                    'success': False,
                    'error': f'Excel file not found at: {file_path}',
                    'current_directory': os.getcwd(),
                    'files_in_data_dir': os.listdir('backend/data') if os.path.exists('backend/data') else 'Directory not found'
                }), 404
        
        # Read the Excel file
        print("📊 Reading Excel file...")
        df = pd.read_excel(file_path)
        
        # Basic data cleaning
        df = df.where(pd.notna(df), None)  # Replace NaN with None for JSON
        
        # Convert to JSON
        data = df.to_dict('records')
        
        print(f"✅ Successfully loaded {len(data)} records")
        
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data),
            'columns': list(df.columns),
            'sample_size': min(5, len(data))
        })
        
    except Exception as e:
        print(f"❌ Error loading dataset: {str(e)}")
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

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 CET College Predictor - Backend Server")
    print("="*50)
    print("📍 Server: http://localhost:5000")
    print("📊 API Docs: http://localhost:5000/")
    print("🎓 Dataset Endpoint: GET /api/colleges/dataset")
    print("📚 College Directory: GET /api/colleges/directory")
    print("🔍 Check directory: GET /api/colleges/directory/stats")
    
    # ✅ ADD COMPARISON INFO
    if COMPARISON_AVAILABLE:
        print("\n🔍 Comparison Service:")
        print("   Test:        http://localhost:5000/api/compare/test")
        print("   Health:      http://localhost:5000/api/compare/health")
        print("   Search:      http://localhost:5000/api/compare/colleges?query=")
        print("   Compare:     POST http://localhost:5000/api/compare/compare")
    else:
        print("\n⚠️  Comparison service not available")
        print("   Check if 'routes/college_comparison_route.py' exists")
    
    print("="*50 + "\n")
    
    # Test if college directory file exists
    dir_path = 'backend/data/Colleges_URL.xlsx'
    abs_path = 'D:/CET_Prediction/cet-web-app/backend/data/Colleges_URL.xlsx'
    
    if os.path.exists(dir_path):
        print(f"✅ College directory file found: {dir_path}")
    elif os.path.exists(abs_path):
        print(f"✅ College directory file found (absolute): {abs_path}")
    else:
        print(f"⚠️  College directory file not found. Expected at:")
        print(f"   - {dir_path}")
        print(f"   - {abs_path}")
        print("   Make sure Colleges_URL.xlsx is in the backend/data/ folder")
    
    app.run(debug=True, port=5000, host='0.0.0.0')