// SitePass v23.7.260 split step 8 - 브라우저 저장소/세션 저장소 공통 파일
// 이 파일에는 localStorage/sessionStorage JSON 저장, 읽기, 삭제 공통 기능을 둡니다.
(function(){
  'use strict';

  function parseJson(value, fallback){
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); } catch (e) { return fallback; }
  }

  function stringify(value){
    try { return JSON.stringify(value); } catch (e) { return ''; }
  }

  function getItem(key, fallback){
    try {
      const value = localStorage.getItem(String(key || ''));
      return value === null || value === undefined ? fallback : value;
    } catch (e) { return fallback; }
  }

  function setItem(key, value){
    try { localStorage.setItem(String(key || ''), String(value)); return true; } catch (e) { return false; }
  }

  function removeItem(key){
    try { localStorage.removeItem(String(key || '')); return true; } catch (e) { return false; }
  }

  function getJson(key, fallback){
    return parseJson(getItem(key, null), fallback);
  }

  function setJson(key, value){
    const text = stringify(value);
    if (!text) return false;
    return setItem(key, text);
  }

  function getSessionItem(key, fallback){
    try {
      const value = sessionStorage.getItem(String(key || ''));
      return value === null || value === undefined ? fallback : value;
    } catch (e) { return fallback; }
  }

  function setSessionItem(key, value){
    try { sessionStorage.setItem(String(key || ''), String(value)); return true; } catch (e) { return false; }
  }

  function removeSessionItem(key){
    try { sessionStorage.removeItem(String(key || '')); return true; } catch (e) { return false; }
  }

  // persistToLocal=true일 때만 localStorage에도 보관합니다.
  // 관리자 세션, 현재회원 세션, OAuth 대기값처럼 새로고침/외부 로그인 복귀 시 끊기면 안 되는 값에 사용합니다.
  function setSessionValue(key, value, persistToLocal){
    setSessionItem(key, value);
    if (persistToLocal) setItem(key, value);
  }

  function getSessionValue(key, persistToLocal){
    const sessionValue = getSessionItem(key, null);
    if (sessionValue !== null && sessionValue !== undefined) return sessionValue;
    if (persistToLocal) {
      const localValue = getItem(key, null);
      if (localValue !== null && localValue !== undefined) {
        setSessionItem(key, localValue);
        return localValue;
      }
    }
    return null;
  }

  function removeSessionValue(key){
    removeSessionItem(key);
    removeItem(key);
  }

  function safeList(value){
    return Array.isArray(value) ? value : [];
  }

  function getList(key){
    return safeList(getJson(key, []));
  }

  function setList(key, list){
    return setJson(key, safeList(list));
  }

  window.SitePassStorage = {
    parseJson,
    stringify,
    getItem,
    setItem,
    removeItem,
    getJson,
    setJson,
    getSessionItem,
    setSessionItem,
    removeSessionItem,
    setSessionValue,
    getSessionValue,
    removeSessionValue,
    getList,
    setList
  };
})();
