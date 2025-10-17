from pathlib import Path
from typing import Generator, Union

from fastkml import kml
from shapely.geometry import MultiPolygon, Point, Polygon

FeatureType = Union[kml.Document, kml.Folder, kml.Placemark]


class FloodZoneChecker:
    """Checks if a given lat/lon is inside any flood zone defined in a KML file."""

    def __init__(self, kml_path: str):
        self.kml_path = Path(kml_path)
        self.polygons: list[Polygon] = []
        self.load_kml()

    def load_kml(self):
        """Load KML file and extract all polygons lazily."""
        if not self.kml_path.exists():
            raise FileNotFoundError(f"KML file not found: {self.kml_path}")

        k_obj = kml.KML()
        with self.kml_path.open("rb") as f:
            k_obj.from_string(f.read())

        for feat in self._iter_features(k_obj.features()):
            geom = getattr(feat, "geometry", None)
            if geom:
                if isinstance(geom, Polygon):
                    self.polygons.append(geom)
                elif isinstance(geom, MultiPolygon):
                    self.polygons.extend(
                        poly for poly in geom.geoms if isinstance(poly, Polygon)
                    )

    def _iter_features(
        self, features: Generator[FeatureType, None, None]
    ) -> Generator[FeatureType, None, None]:
        """Recursively iterate over features in a generator-based way."""
        for feat in features:
            yield feat
            if isinstance(feat, (kml.Document, kml.Folder)):
                yield from self._iter_features(feat.features())  # generator recursion

    def is_in_flood_zone(self, lat: float, lon: float) -> bool:
        """Check if a point is inside any flood zone polygon."""
        point = Point(lon, lat)
        return any(poly.contains(point) for poly in self.polygons)
