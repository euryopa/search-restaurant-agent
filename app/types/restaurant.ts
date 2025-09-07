export type Restaurant = {
  link: string;
  reason: string;
}

export type RestaurantResponse = {
  lunch_restaurants: Restaurant[];
  dinner_restaurants: Restaurant[];
}

export type LocationRequest = {
  location: {
    latitude: number;
    longitude: number;
  };
  date: string; // ISO string format
}