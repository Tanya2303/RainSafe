# geocoder.py
import httpx
from typing import Optional

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

async def reverse_geocode(latitude: float, longitude: float) -> Optional[str]:
    """
    Performs reverse geocoding to get a human-readable location name
    from latitude and longitude using OpenStreetMap Nominatim.
    """
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "zoom": 16, # Adjust zoom level for desired detail (e.g., 18 for address, 10 for city)
        "addressdetails": 0 # We only want the display_name
    }
    headers = {
        "User-Agent": "RainSafeApp/1.0 (your_email@example.com)" # Nominatim requires a User-Agent
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(NOMINATIM_URL, params=params, headers=headers, timeout=5)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            data = response.json()

            if data and "display_name" in data:
                # You might want to process display_name to get a shorter, more relevant name
                # For example, splitting by comma and taking the first few parts.
                full_name = data["display_name"]
                # Example: "123 Main St, Anytown, State, Country" -> "Anytown" or "123 Main St, Anytown"
                parts = full_name.split(', ')
                if len(parts) >= 2:
                    return f"{parts[0]}, {parts[1]}" # e.g., "Koramangala, Bengaluru"
                return full_name
            
            # Fallback if display_name is not found or data is empty
            return f"Lat: {latitude:.4f}, Lon: {longitude:.4f}"

    except httpx.RequestError as exc:
        print(f"HTTPX request error during reverse geocoding for {latitude},{longitude}: {exc}")
        return f"Lat: {latitude:.4f}, Lon: {longitude:.4f}"
    except httpx.HTTPStatusError as exc:
        print(f"HTTP status error during reverse geocoding for {latitude},{longitude}: {exc.response.status_code} - {exc.response.text}")
        return f"Lat: {latitude:.4f}, Lon: {longitude:.4f}"
    except Exception as exc:
        print(f"An unexpected error occurred during reverse geocoding for {latitude},{longitude}: {exc}")
        return f"Lat: {latitude:.4f}, Lon: {longitude:.4f}"