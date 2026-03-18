import { Router, Request, Response } from 'express';
import { supabase } from '../config';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {

    const { data: nodesData, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .not('x', 'is', null)
      .not('y', 'is', null)
      .not('z', 'is', null);

    if (nodesError) throw nodesError;
    if (!nodesData) throw new Error('No nodes returned from database');

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*');

    if (projectsError) throw projectsError;
    if (!projectsData) throw new Error('No projects returned from database');

    const { data: edgesData, error: edgesError } = await supabase
      .from('edges')
      .select('*');

    if (edgesError) throw edgesError;
    if (!edgesData) throw new Error('No edges returned from database');

    const nodeIds = new Set(nodesData.map((n: any) => n.id));
    const projectIds = new Set(projectsData.map((p: any) => p.id));

    const invalidEdges = edgesData.filter(
      (e: any) =>
        (!nodeIds.has(e.source_id) && !projectIds.has(e.source_id)) ||
        (!nodeIds.has(e.target_id) && !projectIds.has(e.target_id))
    );

    if (invalidEdges.length > 0) {
      throw new Error(
        `Invalid edges found: ${JSON.stringify(
          invalidEdges.map((e: any) => ({
            edge_id: e.id,
            source_id: e.source_id,
            target_id: e.target_id,
          }))
        )}`
      );
    }

    const nodes = nodesData.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      description: n.description,
      gravity_score: n.gravity_score,
      tags: n.tags || [],
      is_featured: n.is_featured,
      x: n.x,
      y: n.y,
      z: n.z,
      project_id: n.ref_table === 'projects' ? n.ref_id : null,
    }));

    const projects = projectsData.map((p: any) => {
      const childNodes = nodesData.filter(
        (n: any) => n.ref_table === 'projects' && n.ref_id === p.id
      );

      const x_derived =
        childNodes.length > 0
          ? childNodes.reduce((sum: number, n: any) => sum + n.x, 0) / childNodes.length
          : 0;

      const y_derived =
        childNodes.length > 0
          ? childNodes.reduce((sum: number, n: any) => sum + n.y, 0) / childNodes.length
          : 0;

      const z_derived =
        childNodes.length > 0
          ? childNodes.reduce((sum: number, n: any) => sum + n.z, 0) / childNodes.length
          : 0;

      return {
        id: p.id,
        title: p.name,
        description: p.short_desc || '',
        gravity_score: p.gravity_score,
        is_featured: p.is_featured,
        x_derived,
        y_derived,
        z_derived,
      };
    });

    const edges = edgesData.map((e: any) => ({
      id: e.id,
      source_id: e.source_id,
      target_id: e.target_id,
      relationship_type: e.relationship_type,
    }));

    const relationship_types = Array.from(
      new Set(edges.map((e: any) => e.relationship_type))
    ).sort();

    res.json({
      nodes,
      projects,
      edges,
      metadata: {
        node_count: nodes.length,
        project_count: projects.length,
        edge_count: edges.length,
        relationship_types,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Graph API Error][raw]', error);
    console.error('[Graph API Error][stringified]', JSON.stringify(error, null, 2));

    const message =
      error?.message ||
      error?.error_description ||
      error?.details ||
      JSON.stringify(error) ||
      'Unknown error';

    res.status(500).json({
      error: message,
      raw: error ?? null,
    });
  }
});

export default router;