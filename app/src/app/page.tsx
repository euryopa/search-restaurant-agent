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
        throw new Error('レストラン検索に失敗しました。');
      }

      const data: RestaurantResponse = await response.json();
      setRestaurants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            レストラン検索エージェント
          </h1>
          <p className="text-gray-600">
            AIがあなたの現在地と日付に基づいておすすめのレストランを見つけます
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xl font-bold text-gray-900 mb-4">
                📍 位置
              </label>
              <div className="flex items-center gap-4 mb-3">
                <button
                  onClick={getCurrentLocation}
                  disabled={isLocationLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {isLocationLoading ? '取得中...' : '位置情報を取得'}
                </button>
                {location && (
                  <div className="text-green-600">
                    {address && (
                      <div className="text-gray-700 text-base">
                        📍 <a
                          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {address}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="border-t pt-3 space-y-4">
                {/* 場所名検索 */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    🔍 場所名検索
                  </label>
                  <div className="flex items-center gap-2">
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
                        placeholder="例: 東京駅、渋谷区、新宿..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={searchLocation}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isSearching ? '検索中...' : '検索'}
                    </button>
                  </div>
                </div>

              </div>
                
                {/* 検索結果の表示 */}
                {showResults && searchResults.length > 0 && (
                  <div className="mt-3 border border-gray-200 rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 bg-gray-50 border-b text-sm text-gray-600">
                      {searchResults.length}件の検索結果 (クリックして選択)
                    </div>
                    {searchResults.map((result, index) => {
                      const formattedAddress = formatJapaneseAddress({
                        display_name: result.display_name,
                        address: result.address
                      });
                      
                      return (
                        <button
                          key={index}
                          onClick={() => selectLocationFromResult(result)}
                          className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900 mb-1">
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
                )}
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-xl font-bold text-gray-900 mb-4">
                📅 日時選択
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    日付
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  時間
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                </div>
              </div>
            </div>

            <button
              onClick={searchRestaurants}
              disabled={!location || !selectedDate || !selectedTime || isLoading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer mt-8"
            >
              {isLoading ? '検索中...' : 'レストランを検索'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        {restaurants && (
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">🍽️ ランチ</h2>
              <div className="space-y-4">
                {restaurants.lunch_restaurants.map((restaurant, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md p-4">
                    <a
                      href={restaurant.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium text-lg block mb-2"
                    >
                      レストラン {index + 1} →
                    </a>
                    <p className="text-gray-700">{restaurant.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">🌃 ディナー</h2>
              <div className="space-y-4">
                {restaurants.dinner_restaurants.map((restaurant, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md p-4">
                    <a
                      href={restaurant.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium text-lg block mb-2"
                    >
                      レストラン {index + 1} →
                    </a>
                    <p className="text-gray-700">{restaurant.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
