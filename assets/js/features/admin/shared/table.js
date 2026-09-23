// SitePass STEP87 - side-effect-free admin table model helpers
(function(){
  'use strict';

  function normalizeColumns(columns){
    return (Array.isArray(columns) ? columns : []).map(function(col){
      if (typeof col === 'string') return { key: col, label: col };
      return {
        key: String(col && col.key || ''),
        label: String(col && (col.label || col.key) || '')
      };
    }).filter(function(col){ return !!col.key; });
  }

  function model(columns, rows){
    return {
      columns: normalizeColumns(columns),
      rows: Array.isArray(rows) ? rows.slice() : []
    };
  }

  window.SitePassAdminTable = Object.freeze({
    normalizeColumns: normalizeColumns,
    model: model
  });
})();
