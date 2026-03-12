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
  latitude: number;
  longitude: number;
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

      // Candidate must be within thresholdKm of EVERY existing cluster member,
      // not just the seed — prevents geographically stretched clusters.
      const fitsCluster = nearby.every(member =>
        getDistance(member.latitude, member.longitude, other.latitude, other.longitude) <= thresholdKm
      );

      if (fitsCluster) {
        nearby.push(other);
        processed.add(String(other.id));
      }
    }

    if (nearby.length > 1) {
      // Place cluster marker at the geographic centroid of its members
      const centroidLat = nearby.reduce((sum, t) => sum + t.latitude,  0) / nearby.length;
      const centroidLon = nearby.reduce((sum, t) => sum + t.longitude, 0) / nearby.length;
      clusters.push({
        id: `cluster-${trek.id}`,
        latitude: centroidLat,
        longitude: centroidLon,
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
      targetTrek.latitude,
      targetTrek.longitude,
      trek.latitude,
      trek.longitude
    );
    
    if (distance <= maxDistance) {
      clustered.push(trek);
    }
  }

  return clustered.length > 1 ? clustered : null;
}
