// js/graph/d3-loader.js
/**
 * 集中載入 D3 v7 子模組 (ES Modules)
 */
import { select, selectAll } from 'https://cdn.jsdelivr.net/npm/d3-selection@3/+esm';
import 'https://cdn.jsdelivr.net/npm/d3-transition@3/+esm';
import { zoom, zoomIdentity, zoomTransform } from 'https://cdn.jsdelivr.net/npm/d3-zoom@3/+esm';
import { drag } from 'https://cdn.jsdelivr.net/npm/d3-drag@3/+esm';
import { interpolate, interpolateNumber } from 'https://cdn.jsdelivr.net/npm/d3-interpolate@3/+esm';

export {
  select,
  selectAll,
  zoom,
  zoomIdentity,
  zoomTransform,
  drag,
  interpolate,
  interpolateNumber
};
