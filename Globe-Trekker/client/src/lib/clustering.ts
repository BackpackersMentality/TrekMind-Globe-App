/**
 * Calculates the Haversine distance between two points on a sphere.
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export interface TrekCluster {
  id: string;
  lat: number;
  lng: number;
  treks: any[];
  isCluster: boolean;
}

export function clusterTreks(treks: any[], thresholdKm: number): any[] {
  const clusters: any[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < treks.length; i++) {
    const trek = treks[i];
    if (processed.has(String(trek.id))) continue;

    const nearby: any[] = [trek];
    processed.add(String(trek.id));

    for (let j = i + 1; j < treks.length; j++) {
      const other = treks[j];
      if (processed.has(String(other.id))) continue;

      const distance = getDistance(trek.lat, trek.lng, other.lat, other.lng);
      if (distance <= thresholdKm) {
        nearby.push(other);
        processed.add(String(other.id));
      }
    }

    if (nearby.length > 1) {
      clusters.push({
        id: `cluster-${trek.id}`,
        lat: trek.lat,
        lng: trek.lng,
        treks: nearby,
        isCluster: true
      });
    } else {
      clusters.push({ ...trek, isCluster: false });
    }
  }

  return clusters;
}

export function getClusteredTreks(
  trekId: string,
  allTreks: any[],
  maxDistance: number = 500
): any[] | null {
  const targetTrek = allTreks.find(t => String(t.id) === String(trekId));
  if (!targetTrek) return null;

  const clustered = [targetTrek];
  
  for (const trek of allTreks) {
    if (String(trek.id) === String(trekId)) continue;
    
    const distance = getDistance(
      targetTrek.lat,
      targetTrek.lng,
      trek.lat,
      trek.lng
    );
    
    if (distance <= maxDistance) {
      clustered.push(trek);
    }
  }

  return clustered.length > 1 ? clustered : null;
}
