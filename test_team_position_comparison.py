import requests
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API configuration
API_KEY = os.getenv('FOOTYSTATS_API_KEY')
BASE_URL = os.getenv('FOOTYSTATS_BASE_URL', 'https://api.footystats.org')

headers = {
    "Accept": "application/json"
}

def fetch_team_data(team_id):
    """Fetch team data from the teams endpoint"""
    url = f"{BASE_URL}/teams"
    params = {"id": team_id}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching team {team_id}: {response.status_code}")
        return None

def fetch_league_teams(league_id, season):
    """Fetch teams data from the teams endpoint for a specific league"""
    url = f"{BASE_URL}/teams"
    params = {"league": league_id, "season": season}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching league teams for league {league_id}: {response.status_code}")
        return None

def fetch_standings(league_id, season):
    """Fetch standings data for a specific league"""
    url = f"{BASE_URL}/standings"
    params = {"league": league_id, "season": season}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching standings for league {league_id}: {response.status_code}")
        return None

def analyze_team(team_id, team_name):
    """Analyze a team's data across different endpoints"""
    print(f"\n{'='*60}")
    print(f"Analyzing {team_name} (ID: {team_id})")
    print(f"{'='*60}")
    
    # Fetch team data
    team_data = fetch_team_data(team_id)
    if not team_data:
        return
    
    print(f"\n1. TEAM ENDPOINT DATA:")
    print(f"   Response count: {team_data['results']}")
    
    if team_data['results'] > 0:
        team = team_data['response'][0]['team']
        venue = team_data['response'][0]['venue']
        
        print(f"   Team name: {team['name']}")
        print(f"   Country: {team['country']}")
        print(f"   Founded: {team['founded']}")
        print(f"   Venue: {venue['name']} (Capacity: {venue['capacity']})")
        
        # Get the current season info
        current_year = datetime.now().year
        print(f"\n2. CHECKING RECENT SEASONS ({current_year-1} to {current_year}):")
        
        # For each recent season, check league participation
        for season in [current_year-1, current_year]:
            print(f"\n   Season {season}:")
            
            # Check teams endpoint with team ID and season
            url = f"{BASE_URL}/teams"
            params = {"id": team_id, "season": season}
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                season_data = response.json()
                if season_data['results'] > 0:
                    # The API might return league info in the response
                    print(f"   - Team data available for season {season}")
                    
                    # Now check leagues for this team and season
                    leagues_url = f"{BASE_URL}/leagues"
                    leagues_params = {"team": team_id, "season": season}
                    leagues_response = requests.get(leagues_url, headers=headers, params=leagues_params)
                    
                    if leagues_response.status_code == 200:
                        leagues_data = leagues_response.json()
                        if leagues_data['results'] > 0:
                            print(f"   - Leagues found: {leagues_data['results']}")
                            for league_info in leagues_data['response']:
                                league = league_info['league']
                                country = league_info['country']
                                print(f"     * {league['name']} (ID: {league['id']}) - {country['name']}")
                                
                                # Check teams endpoint for this league
                                print(f"\n3. LEAGUE-TEAMS ENDPOINT DATA (League {league['id']}, Season {season}):")
                                league_teams = fetch_league_teams(league['id'], season)
                                if league_teams and league_teams['results'] > 0:
                                    # Find our team in the response
                                    our_team = None
                                    for team_entry in league_teams['response']:
                                        if team_entry['team']['id'] == team_id:
                                            our_team = team_entry
                                            break
                                    
                                    if our_team:
                                        print(f"   Team found in league-teams response!")
                                        print(f"   Full team entry:")
                                        print(json.dumps(our_team, indent=2))
                                    else:
                                        print(f"   Team NOT found in league-teams response!")
                                        print(f"   Total teams in response: {league_teams['results']}")
                                
                                # Check standings
                                print(f"\n4. STANDINGS DATA (League {league['id']}, Season {season}):")
                                standings = fetch_standings(league['id'], season)
                                if standings and standings['results'] > 0:
                                    # Find our team in standings
                                    team_found = False
                                    for standing_group in standings['response']:
                                        league_standings = standing_group['league']['standings']
                                        for group in league_standings:
                                            for team_standing in group:
                                                if team_standing['team']['id'] == team_id:
                                                    team_found = True
                                                    print(f"   Team found in standings!")
                                                    print(f"   Position: {team_standing['rank']}")
                                                    print(f"   Points: {team_standing['points']}")
                                                    print(f"   Games played: {team_standing['all']['played']}")
                                                    print(f"   Form: {team_standing['form']}")
                                                    break
                                    
                                    if not team_found:
                                        print(f"   Team NOT found in standings!")

# Analyze both teams
print("TEAM POSITION COMPARISON ANALYSIS")
print("="*60)

# Shanghai SIPG (Works correctly)
analyze_team(836, "Shanghai SIPG")

# Chicago Fire (Position issue)
analyze_team(7, "Chicago Fire")

print(f"\n{'='*60}")
print("ANALYSIS COMPLETE")
print(f"{'='*60}")