import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import './App.css';

interface Match {
  id: string;
  homeTeam: {
    id: number;
    name: string;
    logo?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    logo?: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
  };
  date: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
}

interface ApiResponse {
  success: boolean;
  data?: Match[];
  error?: string;
}

const App: React.FC = () => {
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');

  const API_BASE = 'http://localhost:3001/api';

  const fetchTodayMatches = async () => {
    try {
      setLoading(true);
      const response = await axios.get<ApiResponse>(`${API_BASE}/matches/today`);
      
      if (response.data.success && response.data.data) {
        setTodayMatches(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch today\'s matches');
      }
    } catch (err: any) {
      console.error('Error fetching today\'s matches:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingMatches = async () => {
    try {
      const response = await axios.get<ApiResponse>(`${API_BASE}/matches/upcoming?days=7`);
      
      if (response.data.success && response.data.data) {
        setUpcomingMatches(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch upcoming matches');
      }
    } catch (err: any) {
      console.error('Error fetching upcoming matches:', err);
      setError(err.message || 'Network error');
    }
  };

  useEffect(() => {
    fetchTodayMatches();
    fetchUpcomingMatches();
  }, []);

  const formatMatchTime = (dateString: string) => {
    return moment(dateString).format('HH:mm');
  };

  const formatMatchDate = (dateString: string) => {
    return moment(dateString).format('DD/MM/YYYY');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'live':
        return 'bg-red-500 text-white animate-pulse';
      case 'finished':
      case 'complete':
        return 'bg-gray-500 text-white';
      case 'scheduled':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const MatchCard: React.FC<{ match: Match }> = ({ match }) => (
    <div className=\"bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden\">
      {/* League Header */}
      <div className=\"bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2\">
        <div className=\"flex justify-between items-center\">
          <span className=\"font-semibold text-sm\">{match.league.name}</span>
          <span className=\"text-xs opacity-90\">{match.league.country}</span>
        </div>
      </div>

      {/* Match Content */}
      <div className=\"p-4\">
        {/* Teams */}
        <div className=\"flex items-center justify-between mb-4\">
          <div className=\"flex-1 text-center\">
            <div className=\"font-bold text-lg text-gray-800 mb-1\">
              {match.homeTeam.name}
            </div>
            {match.homeScore !== undefined && (
              <div className=\"text-2xl font-bold text-blue-600\">
                {match.homeScore}
              </div>
            )}
          </div>
          
          <div className=\"mx-4 text-center\">
            <div className=\"text-2xl font-bold text-gray-400 mb-2\">VS</div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
              {match.status === 'scheduled' ? formatMatchTime(match.date) : match.status.toUpperCase()}
            </div>
          </div>
          
          <div className=\"flex-1 text-center\">
            <div className=\"font-bold text-lg text-gray-800 mb-1\">
              {match.awayTeam.name}
            </div>
            {match.awayScore !== undefined && (
              <div className=\"text-2xl font-bold text-red-600\">
                {match.awayScore}
              </div>
            )}
          </div>
        </div>

        {/* Match Info */}
        <div className=\"text-center text-sm text-gray-600 space-y-1\">
          <div>📅 {formatMatchDate(match.date)}</div>
          {match.venue && <div>🏟️ {match.venue}</div>}
        </div>

        {/* Action Buttons */}
        <div className=\"mt-4 flex gap-2\">
          <button className=\"flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium\">
            📊 Analiz Et
          </button>
          <button className=\"flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium\">
            🎯 Tahmin Yap
          </button>
        </div>
      </div>
    </div>
  );

  const LoadingSpinner = () => (
    <div className=\"flex justify-center items-center py-12\">
      <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600\"></div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className=\"text-center py-12\">
      <div className=\"text-6xl mb-4\">⚽</div>
      <h3 className=\"text-xl font-semibold text-gray-700 mb-2\">{message}</h3>
      <p className=\"text-gray-500\">Maçlar yüklendiğinde burada görünecek</p>
    </div>
  );

  const currentMatches = activeTab === 'today' ? todayMatches : upcomingMatches;

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50\">
      {/* Header */}
      <header className=\"bg-white shadow-lg border-b border-gray-200\">
        <div className=\"max-w-7xl mx-auto px-4 py-6\">
          <div className=\"flex items-center justify-between\">
            <div>
              <h1 className=\"text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent\">
                ⚽ Football Prediction Engine
              </h1>
              <p className=\"text-gray-600 mt-1\">Powered by FootyStats & Advanced AI</p>
            </div>
            <div className=\"text-right\">
              <div className=\"text-sm text-gray-500\">Son Güncelleme</div>
              <div className=\"font-semibold text-gray-700\">
                {moment().format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className=\"max-w-7xl mx-auto px-4 py-6\">
        <div className=\"flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto mb-8\">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeTab === 'today'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📅 Bugünün Maçları ({todayMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeTab === 'upcoming'
                ? 'bg-white text-purple-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🔮 Yaklaşan Maçlar ({upcomingMatches.length})
          </button>
        </div>

        {/* Content */}
        {error && (
          <div className=\"bg-red-50 border border-red-200 rounded-lg p-4 mb-6\">
            <div className=\"flex items-center\">
              <span className=\"text-red-500 text-lg mr-3\">❌</span>
              <div>
                <h3 className=\"font-semibold text-red-800\">Hata Oluştu</h3>
                <p className=\"text-red-600\">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : currentMatches.length === 0 ? (
          <EmptyState 
            message={activeTab === 'today' ? 'Bugün maç bulunamadı' : 'Yaklaşan maç bulunamadı'} 
          />
        ) : (
          <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
            {currentMatches.map((match, index) => (
              <MatchCard key={match.id || index} match={match} />
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className=\"text-center mt-8\">
          <button
            onClick={() => {
              fetchTodayMatches();
              fetchUpcomingMatches();
            }}
            disabled={loading}
            className=\"bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed\"
          >
            {loading ? '🔄 Yükleniyor...' : '🔄 Yenile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;