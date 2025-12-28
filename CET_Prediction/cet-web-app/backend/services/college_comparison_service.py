import os
import pandas as pd
from functools import lru_cache

# =========================
# CONFIG
# =========================
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "cutoff_trends")

# =========================
# LOAD & CACHE DATA
# =========================
@lru_cache(maxsize=1)
def load_all_cutoff_data():
    """Load all yearly CSVs and merge into single DataFrame"""
    print(f"📂 Loading data from: {DATA_DIR}")
    
    dfs = []
    years_loaded = []
    
    # Load files for specific years
    for year in [2021, 2022, 2023, 2024, 2025]:
        file_path = os.path.join(DATA_DIR, f"{year}.csv")
        
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {year}.csv")
            continue
        
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
            df.columns = df.columns.str.strip().str.lower()
            
            # ADD YEAR COLUMN FROM FILENAME
            df['year'] = year
            print(f"✅ Loaded {year}.csv: {len(df)} records (added year={year})")
            
            # Standardize column names
            column_mapping = {}
            
            # Map percentile columns
            percentile_cols = ['closing_percentile', 'percentile', 'closing_percent', 'cutoff', 'percent']
            for col in percentile_cols:
                if col in df.columns:
                    column_mapping[col] = 'closing_percentile'
                    break
            
            # Map college code
            code_cols = ['college_code', 'collegecode', 'code']
            for col in code_cols:
                if col in df.columns:
                    column_mapping[col] = 'college_code'
                    break
            
            # Map branch code
            branch_code_cols = ['branch_code', 'branchcode', 'branch']
            for col in branch_code_cols:
                if col in df.columns:
                    column_mapping[col] = 'branch_code'
                    break
            
            # Map college name
            name_cols = ['college_name', 'collegename', 'name']
            for col in name_cols:
                if col in df.columns:
                    column_mapping[col] = 'college_name'
                    break
            
            # Apply column mapping
            if column_mapping:
                df = df.rename(columns=column_mapping)
                print(f"   ↳ Standardized columns: {column_mapping}")
            
            # Ensure required columns exist
            required_cols = ['college_code', 'branch_code', 'closing_percentile', 'year']
            for col in required_cols:
                if col not in df.columns:
                    print(f"   ⚠️  Missing column: {col}")
            
            # Convert data types
            if 'closing_percentile' in df.columns:
                df["closing_percentile"] = pd.to_numeric(df["closing_percentile"], errors="coerce")
            
            if 'year' in df.columns:
                df["year"] = pd.to_numeric(df["year"], errors="coerce").astype('Int64')
            
            # Clean string columns
            string_columns = ["college_code", "college_name", "city", "type", "branch_code", "branch_name", "category"]
            for col in string_columns:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.strip()
            
            dfs.append(df)
            years_loaded.append(year)
            
        except Exception as e:
            print(f"❌ Error loading {year}.csv: {str(e)}")
            continue
    
    if not dfs:
        raise ValueError(f"No valid CSV files found in {DATA_DIR}")
    
    # Merge all data
    merged_df = pd.concat(dfs, ignore_index=True)
    print(f"✅ Total records: {len(merged_df)}")
    print(f"📅 Years loaded: {sorted(years_loaded)}")
    
    # Show column statistics
    print("📊 Columns in merged data:")
    for col in merged_df.columns:
        print(f"   - {col}: {merged_df[col].dtype}")
    
    return merged_df


# =========================
# SEARCH COLLEGES
# =========================
def search_colleges(query: str):
    """Search colleges by name or city"""
    try:
        df = load_all_cutoff_data()
        
        # Get unique colleges
        college_cols = ["college_code", "college_name", "city", "type"]
        available_cols = [col for col in college_cols if col in df.columns]
        
        if not available_cols:
            return []
        
        colleges_df = df[available_cols].drop_duplicates(subset=['college_code'])
        
        if query.strip():
            mask = False
            if 'college_name' in df.columns:
                mask = mask | colleges_df["college_name"].str.contains(query, case=False, na=False)
            if 'city' in df.columns:
                mask = mask | colleges_df["city"].str.contains(query, case=False, na=False)
            
            if mask is not False:
                colleges_df = colleges_df[mask]
        
        # Limit to 100 results and ensure we return proper data
        results = colleges_df.sort_values("college_name").head(100).to_dict(orient="records")
        
        # Ensure all required fields exist in results
        for result in results:
            result.setdefault('college_name', 'Unknown College')
            result.setdefault('city', 'Unknown City')
            result.setdefault('type', 'Unknown Type')
        
        print(f"🔍 Search '{query}' found {len(results)} colleges")
        return results
    
    except Exception as e:
        print(f"❌ Error in search_colleges: {str(e)}")
        raise


# =========================
# GET BRANCHES
# =========================
def get_branches_for_colleges(college_codes: list):
    """Get all unique branches available in selected colleges"""
    try:
        df = load_all_cutoff_data()
        
        filtered = df[df["college_code"].isin(college_codes)]
        
        if filtered.empty:
            print(f"⚠️  No data found for colleges: {college_codes}")
            return []
        
        branch_cols = ["branch_code", "branch_name"]
        available_cols = [col for col in branch_cols if col in filtered.columns]
        
        if not available_cols:
            return []
        
        branches = (
            filtered[available_cols]
            .drop_duplicates(subset=['branch_code'])
            .sort_values("branch_name" if 'branch_name' in filtered.columns else "branch_code")
            .to_dict(orient="records")
        )
        
        print(f"🌿 Found {len(branches)} branches for {len(college_codes)} colleges")
        return branches
    
    except Exception as e:
        print(f"❌ Error in get_branches_for_colleges: {str(e)}")
        raise


# =========================
# COMPARE COLLEGES
# =========================
def compare_colleges(college_codes: list, branch_code: str):
    """
    Compare cutoff trends for given colleges over last 5 years
    Uses OPEN category by default for general comparison
    """
    try:
        print(f"🔄 Starting comparison for colleges: {college_codes}, branch: {branch_code}")
        df = load_all_cutoff_data()
        
        # Check required columns exist
        required_cols = ['college_code', 'branch_code', 'closing_percentile', 'year']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            error_msg = f"Data missing required columns: {missing_cols}"
            print(f"❌ {error_msg}")
            return {"error": error_msg}
        
        # Filter for selected colleges and branch
        filtered = df[
            (df["college_code"].isin(college_codes)) &
            (df["branch_code"] == branch_code)
        ].copy()
        
        print(f"📊 Found {len(filtered)} records for filter")
        
        # Try to find OPEN category data (handle different category names)
        if 'category' in filtered.columns:
            open_categories = ['gopens', 'open', 'gen', 'general', 'gopen']
            filtered['category_lower'] = filtered['category'].str.lower()
            filtered = filtered[filtered['category_lower'].isin(open_categories)]
            print(f"📊 After OPEN category filter: {len(filtered)} records")
        
        if filtered.empty:
            error_msg = "No data found for the selected colleges and branch"
            print(f"❌ {error_msg}")
            return {"error": error_msg}
        
        # Get branch name
        branch_name = ""
        if 'branch_name' in filtered.columns and not filtered.empty:
            branch_name = filtered.iloc[0]["branch_name"]
        
        response = {
            "branch_code": branch_code,
            "branch_name": branch_name,
            "comparison": []
        }
        
        for code in college_codes:
            college_df = filtered[filtered["college_code"] == code].sort_values("year")
            
            if college_df.empty:
                print(f"⚠️  No data for college {code}")
                continue
            
            print(f"📈 College {code} has {len(college_df)} years of data")
            
            # Build trend data
            trend = []
            for _, row in college_df.iterrows():
                if pd.notna(row["closing_percentile"]) and pd.notna(row["year"]):
                    trend.append({
                        "year": int(row["year"]),
                        "value": round(float(row["closing_percentile"]), 2)
                    })
            
            if not trend:
                print(f"⚠️  No valid trend data for college {code}")
                continue
            
            # Calculate statistics
            first = trend[0]["value"]
            last = trend[-1]["value"]
            change = round(last - first, 2)
            avg = round(sum(t["value"] for t in trend) / len(trend), 2)
            
            # Get college details
            college_name = row["college_name"] if "college_name" in row else f"College {code}"
            city = row["city"] if "city" in row else "Unknown"
            college_type = row["type"] if "type" in row else "Unknown"
            
            response["comparison"].append({
                "college_code": code,
                "college_name": college_name,
                "city": city,
                "type": college_type,
                "trend": trend,
                "stats": {
                    "first_year": trend[0]["year"],
                    "last_year": trend[-1]["year"],
                    "start_percentile": first,
                    "end_percentile": last,
                    "change": change,
                    "average": avg,
                    "trend_direction": "increasing" if change > 0 else "decreasing" if change < 0 else "stable"
                }
            })
        
        if not response["comparison"]:
            error_msg = "No valid data found for comparison"
            print(f"❌ {error_msg}")
            return {"error": error_msg}
        
        print(f"✅ Comparison successful: {len(response['comparison'])} colleges with data")
        
        # Generate insights
        response["insights"] = generate_insights(response)
        
        return response
    
    except Exception as e:
        print(f"❌ Error in compare_colleges: {str(e)}")
        raise


# =========================
# GENERATE INSIGHTS
# =========================
def generate_insights(comparison_data: dict):
    """Generate human-readable insights"""
    insights = []
    
    colleges = comparison_data.get("comparison", [])
    
    if not colleges:
        return insights
    
    # Find most competitive
    most_competitive = max(colleges, key=lambda x: x["stats"]["end_percentile"])
    insights.append(
        f"🏆 {most_competitive['college_name']} has the highest current cutoff at {most_competitive['stats']['end_percentile']}%"
    )
    
    # Find biggest improvement
    if len(colleges) > 1:
        biggest_change = max(colleges, key=lambda x: abs(x["stats"]["change"]))
        if abs(biggest_change["stats"]["change"]) > 0.5:
            direction = "increased" if biggest_change["stats"]["change"] > 0 else "decreased"
            insights.append(
                f"📈 {biggest_change['college_name']} showed the biggest change, {direction} by {abs(biggest_change['stats']['change'])}%"
            )
    
    # Trend analysis
    increasing = [c for c in colleges if c["stats"]["trend_direction"] == "increasing"]
    decreasing = [c for c in colleges if c["stats"]["trend_direction"] == "decreasing"]
    
    if len(increasing) == len(colleges):
        insights.append("📊 All selected colleges show increasing cutoff trends, indicating growing competition")
    elif len(decreasing) == len(colleges):
        insights.append("📊 All selected colleges show decreasing cutoff trends")
    else:
        insights.append(f"📊 {len(increasing)} increasing, {len(decreasing)} decreasing trends among selected colleges")
    
    return insights