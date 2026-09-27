import type { InfrastructureCategory, RecommendedProject } from '../types/domain';

export interface SatelliteAudit {
  preImageUrl: string;
  postImageUrl: string;
  verificationScore: number;
  completionDate: string;
}

// Hand-curated Unsplash pairs — visually distinct "before" and "after" per infrastructure sector.
const IMAGES_BY_CATEGORY: Record<InfrastructureCategory, { pre: string; post: string }> = {
  rural_roads: {
    pre: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    post: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
  },
  clean_water: {
    pre: 'https://images.unsplash.com/photo-1583316540519-9d1d8c1e3f8b?auto=format&fit=crop&w=1200&q=80',
    post: 'https://images.unsplash.com/photo-1499250464907-bf6286a959cb?auto=format&fit=crop&w=1200&q=80',
  },
  healthcare: {
    pre: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
    post: 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?auto=format&fit=crop&w=1200&q=80',
  },
  school_upgrades: {
    pre: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80',
    post: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
  },
  power_grid: {
    pre: 'https://images.unsplash.com/photo-1518709911915-712d5fd04677?auto=format&fit=crop&w=1200&q=80',
    post: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
  },
  sanitation_drainage: {
    pre: 'https://images.unsplash.com/photo-1584452093506-2c86a7cabbaa?auto=format&fit=crop&w=1200&q=80',
    post: 'https://images.unsplash.com/photo-1567613915827-c0a6b3f0fea5?auto=format&fit=crop&w=1200&q=80',
  },
};

// Simple deterministic hash keeps the verification score stable per project.
function stableScore(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const range = 98 - 88;
  return 88 + (Math.abs(h) % (range + 1));
}

export function getAuditImages(project: RecommendedProject): SatelliteAudit {
  // Prefer the seeded audit if the project already has one.
  if (project.satelliteAudit) {
    return {
      preImageUrl: project.satelliteAudit.preImageUrl,
      postImageUrl: project.satelliteAudit.postImageUrl,
      verificationScore: project.satelliteAudit.verificationScore,
      completionDate: project.satelliteAudit.completionDate,
    };
  }
  const pair = IMAGES_BY_CATEGORY[project.category] ?? IMAGES_BY_CATEGORY.rural_roads;
  return {
    preImageUrl: pair.pre,
    postImageUrl: pair.post,
    verificationScore: stableScore(project.h3ClusterId || project.id),
    completionDate: new Date().toISOString().slice(0, 10),
  };
}
