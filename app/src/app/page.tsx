'use client';

import { useState } from 'react';
import { LocationRequest, RestaurantResponse } from '../../types/restaurant';

export default function Home() {
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [restaurants, setRestaurants] = useState<RestaurantResponse | null>(null);
  const [error, setError] = useState<string>('');

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setError('');
        },
        () => {
          setError('位置情報の取得に失敗しました。位置情報の使用を許可してください。');
        }
      );
    } else {
      setError('お使いのブラウザは位置情報に対応していません。');
    }
  };

  const searchRestaurants = async () => {
    if (!location) {
      setError('まず位置情報を取得してください。');
      return;
    }
    
    if (!selectedDate) {
      setError('日付を選択してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const requestBody: LocationRequest = {
        location,
        date: new Date(selectedDate).toISOString()
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

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                現在地
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={getCurrentLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  位置情報を取得
                </button>
                {location && (
                  <span className="text-sm text-green-600">
                    取得済み ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={today}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <button
              onClick={searchRestaurants}
              disabled={!location || !selectedDate || isLoading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
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
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">ランチ</h2>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">ディナー</h2>
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
    </div>
  );
}
