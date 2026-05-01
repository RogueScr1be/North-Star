/**
 * PULSARSTYLES.TS
 * Configuration constants for Pulsar Node Design
 */

export const PULSAR_CORE = {
  // Geometry
  geometry: 'icosahedron',
  radius: 1.0,
  detail: 2,
  // Material
  opacity: 0.95,
  transparent: true,
  // Scale: dynamic via getNodeScale(node)
} as const;

export const PULSAR_RING_1 = {
  // Geometry
  majorRadius: 1.5,
  minorRadius: 0.08,
  segmentsRadial: 16,
  segmentsTubular: 100,
  // Material
  baseOpacity: 0.4,
  blending: 'additive',
  transparent: true,
  depthWrite: false,
  // Animation
  rotationSpeed: 0.5, // rpm
  pulseAmplitude: 0.2,
  pulseOffset: 0.3,
} as const;

export const PULSAR_RING_2 = {
  // Geometry
  majorRadius: 2.0,
  minorRadius: 0.06,
  segmentsRadial: 16,
  segmentsTubular: 100,
  // Material
  baseOpacity: 0.25,
  blending: 'additive',
  transparent: true,
  depthWrite: false,
  // Animation
  rotationSpeed: -0.3, // rpm (counter-rotation)
  pulseAmplitude: 0.2,
  pulseOffset: 0.15,
  pulsePeriod: 3, // seconds (faster than Ring 1)
} as const;

export const PULSAR_ANIMATION = {
  // Shared across all Pulsar nodes
  timeStep: 0.01, // per frame (assuming 60 FPS)
  coreOpacity: 0.95,
  // Ring breathing
  ring1PulsePeriod: 2.0, // seconds
  ring1PulseAmplitude: 0.2,
  ring2PulsePeriod: 3.0, // seconds
  ring2PulseAmplitude: 0.2,
} as const;

export const PULSAR_FEATURE_FLAG = 'VITE_PULSAR_NODES_ENABLED';
