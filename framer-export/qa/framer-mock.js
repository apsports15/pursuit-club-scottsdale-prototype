// Stand-in for Framer's "framer" module in the QA harness: just what the component uses.
export const ControlType = { String: 'string', Boolean: 'boolean', Link: 'link', Number: 'number', Enum: 'enum' };
export function addPropertyControls(component, controls) { component.propertyControls = controls; }
export const RenderTarget = {
  canvas: 'CANVAS',
  export: 'EXPORT',
  thumbnail: 'THUMBNAIL',
  preview: 'PREVIEW',
  current: () => (typeof window !== 'undefined' && window.__renderTarget) || 'PREVIEW',
};
