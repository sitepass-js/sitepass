// SitePass STEP87 - stateless page/cursor helpers
(function(){
  'use strict';

  function positiveInt(value, fallback){
    var n = Number(value);
    if (!Number.isFinite(n) || n < 1) return Number(fallback) > 0 ? Math.floor(Number(fallback)) : 1;
    return Math.floor(n);
  }

  function pageInfo(totalRows, page, pageSize){
    var total = Math.max(0, Number(totalRows) || 0);
    var size = positiveInt(pageSize, 20);
    var totalPages = Math.max(1, Math.ceil(total / size));
    var current = Math.min(totalPages, positiveInt(page, 1));
    return {
      page: current,
      pageSize: size,
      totalRows: total,
      totalPages: totalPages,
      offset: (current - 1) * size
    };
  }

  function slice(rows, page, pageSize){
    var list = Array.isArray(rows) ? rows : [];
    var info = pageInfo(list.length, page, pageSize);
    return {
      info: info,
      rows: list.slice(info.offset, info.offset + info.pageSize)
    };
  }

  function hasNextCursor(cursor){
    return cursor !== null && cursor !== undefined && String(cursor).trim() !== '';
  }

  window.SitePassAdminPagination = Object.freeze({
    pageInfo: pageInfo,
    slice: slice,
    hasNextCursor: hasNextCursor
  });
})();
