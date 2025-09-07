'use client';

import { useEffect, useState } from 'react';
import { LocationRequest, RestaurantResponse } from '../../types/restaurant';

export default function Home() {
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [address, setAddress] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);
  const [restaurants, setRestaurants] = useState<RestaurantResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>>([]);
  const [showResults, setShowResults] = useState<boolean>(false);

  // 初期化：デフォルト値設定と位置情報の自動取得
  useEffect(() => {
    const initializeApp = async () => {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5); // HH:MM format
      
      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
      
      // 自動で位置情報を取得
      await getCurrentLocation();
    };
    
    initializeApp();
  }, []);

  const formatJapaneseAddress = (addressData: {address?: {[key: string]: string}, display_name?: string}) => {
    if (!addressData.address) return addressData.display_name;
    
    const addr = addressData.address;
    const parts = [];
    
    // 日本の住所順序: 都道府県 → 市区町村 → 町名 → 番地
    if (addr.state || addr.prefecture) parts.push(addr.state || addr.prefecture);
    if (addr.city) parts.push(addr.city);
    if (addr.town || addr.suburb || addr.neighbourhood) parts.push(addr.town || addr.suburb || addr.neighbourhood);
    if (addr.house_number && addr.road) parts.push(`${addr.road}${addr.house_number}`);
    else if (addr.road) parts.push(addr.road);
    
    return parts.length > 0 ? parts.join('') : addressData.display_name;
  };

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      // OpenStreetMapのNominatim APIを使用してリバースジオコーディング
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('住所の取得に失敗しました');
      }
      
      const data = await response.json();
      return formatJapaneseAddress(data) || '住所が見つかりませんでした';
    } catch (error) {
      console.error('住所取得エラー:', error);
      return '住所の取得に失敗しました';
    }
  };

  const getCurrentLocation = async () => {
    setIsLocationLoading(true);
    setError('');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setLocation(coords);
            
            // 住所を取得
            const addressResult = await getAddressFromCoordinates(coords.latitude, coords.longitude);
            setAddress(addressResult);
          } catch {
            setError('住所の取得に失敗しました。');
          } finally {
            setIsLocationLoading(false);
          }
        },
        () => {
          setError('位置情報の取得に失敗しました。位置情報の使用を許可してください。');
          setIsLocationLoading(false);
        }
      );
    } else {
      setError('お使いのブラウザは位置情報に対応していません。');
      setIsLocationLoading(false);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      setError('検索する場所を入力してください。');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      // 通常の場所名検索（複数結果を取得）
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=ja&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('場所の検索に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        setError('指定された場所が見つかりませんでした。');
        setShowResults(false);
        setSearchResults([]);
        return;
      }
      
      // 検索結果を保存して表示
      setSearchResults(data);
      setShowResults(true);
      
      // 最初の結果を自動選択
      if (data.length > 0) {
        selectLocationFromResult(data[0]);
      }
      
    } catch (error) {
      console.error('場所検索エラー:', error);
      setError('場所の検索中にエラーが発生しました。');
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocationFromResult = (result: { display_name: string; lat: string; lon: string; address?: Record<string, string> }) => {
    const coords = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon)
    };
    
    setLocation(coords);
    const formattedAddress = formatJapaneseAddress({
      display_name: result.display_name,
      address: result.address
    });
    setAddress(formattedAddress || result.display_name);
    setShowResults(false);
  };

  const searchRestaurants = async () => {
    if (!location) {
      setError('まず位置情報を取得してください。');
      return;
    }
    
    if (!selectedDate || !selectedTime) {
      setError('日付と時間を選択してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 日付と時間を組み合わせてISO文字列を作成
      const combinedDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      const requestBody: LocationRequest = {
        location,
        date: combinedDateTime.toISOString()
      };

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `レストラン検索に失敗しました (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Check if response contains error
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Validate response structure
      if (!data.lunch_restaurants || !data.dinner_restaurants) {
        throw new Error('無効なレスポンス形式です。');
      }
      
      setRestaurants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-200 rounded-2xl mb-6 shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Restaurant Finder
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            AIが最適なレストランを見つけます
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-8">
            {/* Location Section */}
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-700 text-sm font-bold">📍</span>
                </div>
                <h2 className="text-xl font-bold text-gray-700">位置情報</h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading}
                  className="px-6 py-3 bg-blue-300 text-blue-800 rounded-xl hover:bg-blue-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center justify-center">
                    {isLocationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
                        取得中...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">📍</span>
                        現在地を取得
                      </>
                    )}
                  </div>
                </button>
                
                {location && (
                  <div className="flex-1 px-4 py-3 bg-green-50 rounded-xl border border-green-200">
                    {address && (
                      <div className="flex items-center">
                        <span className="mr-2 text-green-600">✅</span>
                        <a
                          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-800 hover:text-green-900 font-medium hover:underline transition-colors"
                        >
                          {address}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-purple-200 rounded-md flex items-center justify-center mr-3">
                    <span className="text-purple-700 text-xs">🔍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">場所を検索</h3>
                </div>
                
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (!e.target.value.trim()) {
                          setShowResults(false);
                          setSearchResults([]);
                        }
                      }}
                      placeholder="東京駅、渋谷区、新宿..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent text-gray-800 placeholder-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchLocation();
                        }
                        if (e.key === 'Escape') {
                          setShowResults(false);
                        }
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setShowResults(false);
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={searchLocation}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-6 py-3 bg-purple-300 text-purple-800 rounded-xl hover:bg-purple-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold shadow-md hover:shadow-lg"
                  >
                    {isSearching ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-800 mr-2"></div>
                        検索中
                      </div>
                    ) : (
                      '検索'
                    )}
                  </button>
                </div>
              </div>
                
              {/* Search Results */}
              {showResults && searchResults.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      {searchResults.length}件の検索結果
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => {
                      const formattedAddress = formatJapaneseAddress({
                        display_name: result.display_name,
                        address: result.address
                      });
                      
                      return (
                        <button
                          key={index}
                          onClick={() => selectLocationFromResult(result)}
                          className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-800 mb-1">
                            {formattedAddress || result.display_name}
                          </div>
                          {formattedAddress !== result.display_name && (
                            <div className="text-sm text-gray-500 truncate">
                              {result.display_name}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Date Time Section */}
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-orange-700 text-sm font-bold">📅</span>
                </div>
                <h2 className="text-xl font-bold text-gray-700">日時選択</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    📅 日付
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent text-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    🕐 時間
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={searchRestaurants}
              disabled={!location || !selectedDate || !selectedTime || isLoading}
              className="w-full px-8 py-4 bg-red-300 text-red-800 rounded-xl hover:bg-red-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-bold text-lg shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-800 mr-3"></div>
                  レストランを検索中...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🔎</span>
                  レストランを検索
                </div>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {restaurants && (
          <div className="space-y-10">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-yellow-200 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-yellow-700 text-lg">🍽️</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-700">
                  ランチ
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {restaurants.lunch_restaurants.map((restaurant, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                          <span className="text-orange-600 text-lg">🍴</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                            おすすめランチ {index + 1}
                          </h3>
                          <div className="text-sm text-gray-500 mt-1">
                            AI推薦レストラン
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        ↗️
                      </div>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-orange-300">
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {restaurant.reason}
                      </p>
                    </div>
                    
                    <a
                      href={restaurant.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 rounded-lg font-medium transition-colors duration-200 group/link"
                    >
                      <span className="mr-2">🌐</span>
                      詳細を見る
                      <span className="ml-2 transform group-hover/link:translate-x-1 transition-transform duration-200">→</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-red-200 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-red-700 text-lg">🌃</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-700">
                  ディナー
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {restaurants.dinner_restaurants.map((restaurant, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-red-200 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-200 transition-colors">
                          <span className="text-red-600 text-lg">🍷</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-red-600 transition-colors">
                            おすすめディナー {index + 1}
                          </h3>
                          <div className="text-sm text-gray-500 mt-1">
                            AI推薦レストラン
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        ↗️
                      </div>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-red-300">
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {restaurant.reason}
                      </p>
                    </div>
                    
                    <a
                      href={restaurant.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 rounded-lg font-medium transition-colors duration-200 group/link"
                    >
                      <span className="mr-2">🌐</span>
                      詳細を見る
                      <span className="ml-2 transform group-hover/link:translate-x-1 transition-transform duration-200">→</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}