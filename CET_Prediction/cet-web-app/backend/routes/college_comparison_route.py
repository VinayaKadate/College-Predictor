from flask import Blueprint, request, jsonify
from flask_cors import CORS
from datetime import datetime
import traceback

# Try importing service functions
try:
    from services.college_comparison_service import (
        search_colleges,
        get_branches_for_colleges,
        compare_colleges,
        load_all_cutoff_data
    )
    SERVICE_AVAILABLE = True
    print("✅ College comparison service imported successfully")
except ImportError as e:
    print(f"❌ Failed to import college comparison service: {e}")
    traceback.print_exc()
    SERVICE_AVAILABLE = False

# =========================
# CREATE BLUEPRINT
# =========================
comparison_bp = Blueprint("college_comparison", __name__, url_prefix="/api/compare")
CORS(comparison_bp)

# =========================
# TEST ENDPOINT
# =========================
@comparison_bp.route("/test", methods=["GET"])
def test_endpoint():
    """Test endpoint to verify blueprint is working"""
    return jsonify({
        "success": True,
        "message": "College comparison API is operational",
        "timestamp": datetime.now().isoformat(),
        "service_available": SERVICE_AVAILABLE,
        "endpoints": {
            "search_colleges": "GET /api/compare/colleges?query=<search_term>",
            "get_branches": "POST /api/compare/branches",
            "compare_colleges": "POST /api/compare/compare",
            "health_check": "GET /api/compare/health",
            "test": "GET /api/compare/test"
        }
    }), 200


# =========================
# HEALTH CHECK
# =========================
@comparison_bp.route("/health", methods=["GET"])
def health_check():
    """Check if comparison service is working properly"""
    try:
        if not SERVICE_AVAILABLE:
            return jsonify({
                "status": "unhealthy",
                "error": "Service module not imported",
                "service_available": False
            }), 503
        
        # Try loading data to verify everything works
        df = load_all_cutoff_data()
        
        if df is None or len(df) == 0:
            return jsonify({
                "status": "unhealthy",
                "error": "No data loaded",
                "service_available": True
            }), 500
        
        return jsonify({
            "status": "healthy",
            "message": "College comparison service is fully operational",
            "service_available": True,
            "data_stats": {
                "total_records": len(df),
                "years_available": sorted(df["year"].dropna().unique().tolist()) if "year" in df.columns else [],
                "total_colleges": df["college_code"].nunique() if "college_code" in df.columns else 0,
                "total_branches": df["branch_code"].nunique() if "branch_code" in df.columns else 0
            }
        }), 200
    
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "service_available": SERVICE_AVAILABLE
        }), 500


# =========================
# SEARCH COLLEGES
# =========================
@comparison_bp.route("/colleges", methods=["GET"])
def search_colleges_api():
    """
    Search colleges by name or city.
    Query parameter: query (optional, returns all if empty)
    Example: GET /api/compare/colleges?query=pune
    """
    if not SERVICE_AVAILABLE:
        return jsonify({
            "error": "Service unavailable",
            "message": "College comparison service is not loaded"
        }), 503
    
    query = request.args.get("query", "").strip()
    
    try:
        results = search_colleges(query)
        
        return jsonify({
            "success": True,
            "count": len(results),
            "colleges": results
        }), 200
    
    except Exception as e:
        print(f"❌ Error in search_colleges_api: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Failed to search colleges",
            "message": str(e)
        }), 500


# =========================
# GET BRANCHES
# =========================
@comparison_bp.route("/branches", methods=["POST"])
def get_branches_api():
    """
    Get branches available in selected colleges.
    Request body: { "college_codes": ["6006", "6175"] }
    """
    if not SERVICE_AVAILABLE:
        return jsonify({
            "error": "Service unavailable",
            "message": "College comparison service is not loaded"
        }), 503
    
    data = request.get_json()
    
    # Validation
    if not data or "college_codes" not in data:
        return jsonify({
            "error": "Invalid request",
            "message": "college_codes field is required in request body"
        }), 400
    
    college_codes = data["college_codes"]
    
    if not isinstance(college_codes, list) or len(college_codes) == 0:
        return jsonify({
            "error": "Invalid college_codes",
            "message": "college_codes must be a non-empty list"
        }), 400
    
    try:
        branches = get_branches_for_colleges(college_codes)
        
        return jsonify({
            "success": True,
            "count": len(branches),
            "branches": branches
        }), 200
    
    except Exception as e:
        print(f"❌ Error in get_branches_api: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Failed to fetch branches",
            "message": str(e)
        }), 500


# =========================
# COMPARE COLLEGES (MAIN API)
# =========================
@comparison_bp.route("/compare", methods=["POST"])
def compare_colleges_api():
    """
    Compare cutoff trends for selected colleges.
    Request body: {
        "college_codes": ["6006", "6175"],
        "branch_code": "CS"
    }
    """
    if not SERVICE_AVAILABLE:
        return jsonify({
            "error": "Service unavailable",
            "message": "College comparison service is not loaded"
        }), 503
    
    data = request.get_json()
    
    # Validation
    if not data:
        return jsonify({
            "error": "Invalid request",
            "message": "Request body is required"
        }), 400
    
    # Check required fields
    if "college_codes" not in data or "branch_code" not in data:
        return jsonify({
            "error": "Missing required fields",
            "message": "Both college_codes and branch_code are required"
        }), 400
    
    college_codes = data["college_codes"]
    branch_code = data["branch_code"]
    
    # Validate college_codes
    if not isinstance(college_codes, list):
        return jsonify({
            "error": "Invalid college_codes",
            "message": "college_codes must be a list"
        }), 400
    
    if len(college_codes) < 2:
        return jsonify({
            "error": "Insufficient colleges",
            "message": "Please select at least 2 colleges to compare"
        }), 400
    
    if len(college_codes) > 3:
        return jsonify({
            "error": "Too many colleges",
            "message": "Maximum 3 colleges can be compared at once"
        }), 400
    
    # Validate branch_code
    if not branch_code or not isinstance(branch_code, str):
        return jsonify({
            "error": "Invalid branch_code",
            "message": "branch_code must be a non-empty string"
        }), 400
    
    try:
        # Perform comparison
        result = compare_colleges(college_codes, branch_code)
        
        # Check if error returned from service
        if "error" in result:
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 404
        
        return jsonify({
            "success": True,
            "data": result
        }), 200
    
    except Exception as e:
        print(f"❌ Error in compare_colleges_api: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Comparison failed",
            "message": str(e)
        }), 500


# =========================
# ERROR HANDLERS
# =========================
@comparison_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "message": "The requested comparison endpoint does not exist",
        "available_endpoints": [
            "GET /api/compare/colleges",
            "POST /api/compare/branches",
            "POST /api/compare/compare",
            "GET /api/compare/health",
            "GET /api/compare/test"
        ]
    }), 404


@comparison_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal server error",
        "message": "An unexpected error occurred in the comparison service"
    }), 500