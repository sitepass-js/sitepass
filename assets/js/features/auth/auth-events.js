// SitePass Step79 WORKING TEST - auth/member decoupling event contract
(function () {
  'use strict';

  var state = {
    revision: 0,
    type: '',
    reason: ''
  };
  var listeners = [];

  function snapshot() {
    return {
      revision: state.revision,
      type: state.type,
      reason: state.reason
    };
  }

  function emit(type, reason) {
    state.revision += 1;
    state.type = String(type || '');
    state.reason = String(reason || '');

    var value = snapshot();

    listeners.slice().forEach(function (listener) {
      try {
        listener(value);
      } catch (error) {
        console.warn(
          '[SitePass Step79] auth event listener failed',
          error
        );
      }
    });

    try {
      window.dispatchEvent(
        new CustomEvent(
          'sitepass-auth-session-event-v79',
          { detail: value }
        )
      );
    } catch (error) {}

    return value;
  }

  function subscribe(listener, options) {
    if (typeof listener !== 'function') {
      return function () {};
    }

    if (listeners.indexOf(listener) < 0) {
      listeners.push(listener);
    }

    var replay =
      !options ||
      options.replay !== false;

    if (replay && state.revision > 0) {
      try {
        listener(snapshot());
      } catch (error) {
        console.warn(
          '[SitePass Step79] auth event replay failed',
          error
        );
      }
    }

    return function () {
      listeners =
        listeners.filter(function (item) {
          return item !== listener;
        });
    };
  }

  function bootstrapSignedOutFromAuthSession() {
    var authSession =
      window.SitePassAuthSession || null;

    if (
      !authSession ||
      typeof authSession.getSession !== 'function'
    ) {
      return;
    }

    Promise.resolve()
      .then(function () {
        return authSession.getSession();
      })
      .then(function (result) {
        /*
         * 인증 조회 실패를 로그아웃으로 오판하지 않습니다.
         * 실제 session 필드가 정상 반환됐고 그 값이 null인 경우만
         * 최초 SIGNED_OUT 경계를 생성합니다.
         */
        if (!result || result.error) {
          return;
        }

        if (
          !result.data ||
          !Object.prototype.hasOwnProperty.call(
            result.data,
            'session'
          )
        ) {
          return;
        }

        /*
         * 세션 확인 대기 중 더 최신 인증 이벤트가 먼저 발생했다면
         * 그 상태를 덮어쓰지 않습니다.
         */
        var current = snapshot();

        if (current.revision > 0) {
          return;
        }

        if (result.data.session) {
          emit(
            'SIGNED_IN',
            'auth-session-bootstrap-existing-session'
          );
          return;
        }

        emit(
          'SIGNED_OUT',
          'auth-session-bootstrap-null-session'
        );
      })
      .catch(function () {
        /*
         * 세션 확인 실패 시 SIGNED_OUT으로 추정하지 않습니다.
         */
      });
  }
  window.SitePassAuthEvents = {
    emitSignedIn: function (reason) {
      return emit(
        'SIGNED_IN',
        reason || 'member-login'
      );
    },

    emitSignedOut: function (reason) {
      return emit(
        'SIGNED_OUT',
        reason || 'member-logout'
      );
    },

    subscribe: subscribe,
    getState: snapshot
  };

  bootstrapSignedOutFromAuthSession();
})();
