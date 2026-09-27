import type { DistrictMetric } from '../types/domain';
import { districtsCol } from './firestore';
import { geocode } from './nominatim';
import { extractPopulation, fetchDistrictSummary } from './wikipediaEnrich';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchDistrictByName(
  all: DistrictMetric[],
  name: string | null | undefined,
): DistrictMetric | undefined {
  if (!name) return undefined;
  const target = normalize(name);
  return (
    all.find((d) => normalize(d.districtName) === target) ??
    all.find((d) => normalize(d.districtName).includes(target)) ??
    all.find((d) => target.includes(normalize(d.districtName)))
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function generateHexPolygon(lat: number, lng: number, radiusKm = 0.25): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  const kmPerLatDeg = 111.0;
  const kmPerLngDeg = 111.0 * Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + 30) * (Math.PI / 180);
    const dLat = (radiusKm * Math.sin(angle)) / kmPerLatDeg;
    const dLng = (radiusKm * Math.cos(angle)) / kmPerLngDeg;
    coords.push([lat + dLat, lng + dLng]);
  }
  return coords;
}

// Called only when we hit a district name that has no seeded match; seeds a conservative doc.
export async function provisionDistrict(
  districtName: string,
  state: string | null,
): Promise<DistrictMetric> {
  const id = `dist_${slugify(districtName) || 'auto'}_${Date.now().toString(36).slice(-4)}`;
  const [geo, wiki] = await Promise.all([
    geocode(`${districtName}${state ? `, ${state}` : ''}, India`),
    fetchDistrictSummary(districtName, state),
  ]);
  const lat = geo?.lat ?? 23.5;
  const lng = geo?.lng ?? 78.9;
  const censusPopulation = wiki ? extractPopulation(wiki.extract) : undefined;
  const doc: DistrictMetric = {
    districtId: id,
    districtName: districtName.trim(),
    state: (state ?? 'India').trim(),
    lat,
    lng,
    h3Index: '',
    h3HexCoordinates: generateHexPolygon(lat, lng),
    populationDensity: 1000,
    vulnerabilityIndex: 0.5,
    roadDeficitIndex: 50,
    waterDeficitIndex: 50,
    healthDeficitIndex: 50,
    schoolDeficitIndex: 50,
    powerDeficitIndex: 50,
    aspirationalDistrict: false,
    unspentPFMSFundsCr: 10,
    gatiShaktiBaseline: {
      existingRoadKm: 0,
      waterPipelineCoveragePct: 50,
      primaryHealthCentres: 0,
      electrifiedSchoolsPct: 50,
    },
    citizenDemandCount: 0,
    priorityIndex: 50,
    wikipediaSummary: wiki?.extract,
    wikipediaUrl: wiki?.url,
    censusPopulation,
  };
  await districtsCol().doc(id).set(doc);
  return doc;
}
