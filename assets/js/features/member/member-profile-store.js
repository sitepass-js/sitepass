// SitePass Step79 WORKING TEST - member profile/local-storage boundary
(function () {
  'use strict';

  var PROFILE_KEY =
    'sitepass_signup_profiles_v463';

  var LEGACY_PROFILE_KEY =
    'sitepass_signup_profiles_v462';

  function safeText(value) {
    return String(
      value == null ? '' : value
    ).trim();
  }

  function digits(value) {
    return String(value || '')
      .replace(/[^0-9]/g, '')
      .slice(0, 11);
  }

  function normalizeKey(value) {
    return safeText(value)
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  function readProfiles() {
    try {
      var current =
        JSON.parse(
          localStorage.getItem(PROFILE_KEY) ||
          '{}'
        );

      var legacy =
        JSON.parse(
          localStorage.getItem(
            LEGACY_PROFILE_KEY
          ) || '{}'
        );

      current =
        current &&
        typeof current === 'object'
          ? current
          : {};

      legacy =
        legacy &&
        typeof legacy === 'object'
          ? legacy
          : {};

      return Object.assign(
        {},
        legacy,
        current
      );

    } catch (error) {
      return {};
    }
  }

  function writeProfiles(value) {
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(value || {})
      );
    } catch (error) {}
  }

  function memberKeys(member) {
    if (!member) return [];

    var raw = [
      member.signupId,
      member.login_id,
      member.loginId,
      member.providerId,
      member.provider_id,
      member.id,
      member.phone,
      member.signupIdentityPhone,
      member.verifiedPhone
    ];

    var result = [];

    raw.forEach(function (value) {
      var key =
        normalizeKey(value);

      if (
        key &&
        result.indexOf(key) < 0
      ) {
        result.push(key);
      }

      var phoneKey =
        digits(value);

      if (
        phoneKey &&
        result.indexOf(phoneKey) < 0
      ) {
        result.push(phoneKey);
      }
    });

    return result;
  }

  function pickFirst(values) {
    for (
      var i = 0;
      i < values.length;
      i += 1
    ) {
      var value =
        safeText(values[i]);

      if (value) return value;
    }

    return '';
  }

  function getCachedProfile(memberOrKey) {
    var profiles =
      readProfiles();

    var keys =
      typeof memberOrKey === 'object'
        ? memberKeys(memberOrKey)
        : [
            normalizeKey(memberOrKey),
            digits(memberOrKey)
          ];

    for (
      var i = 0;
      i < keys.length;
      i += 1
    ) {
      if (
        keys[i] &&
        profiles[keys[i]]
      ) {
        return profiles[keys[i]];
      }
    }

    return null;
  }

  function storeSignupProfile(member) {
    if (!member) return;

    var name =
      pickFirst([
        member.signupIdentityName,
        member.verifiedName,
        member.identityName,
        member.name
      ]);

    var phone =
      digits(
        pickFirst([
          member.signupIdentityPhone,
          member.verifiedPhone,
          member.identityPhone,
          member.phone
        ])
      );

    if (!name && !phone) return;

    var profile = {
      name: name,
      phone: phone,
      signupId:
        safeText(
          member.signupId ||
          member.login_id ||
          member.loginId
        ),
      savedAt:
        new Date().toISOString()
    };

    var profiles =
      readProfiles();

    var keys =
      memberKeys(member);

    if (
      !keys.length &&
      profile.signupId
    ) {
      keys.push(
        normalizeKey(profile.signupId)
      );
    }

    keys.forEach(function (key) {
      if (key) {
        profiles[key] = profile;
      }
    });

    writeProfiles(profiles);
  }

  function removeLegacyAuthFields(loginId, authUserId) {
    try {
      if (
        typeof window.getMembers !==
          'function' ||
        typeof window.setMembers !==
          'function'
      ) {
        return false;
      }

      var key =
        safeText(loginId).toLowerCase();

      var uid =
        safeText(authUserId).toLowerCase();

      if (!key && !uid) {
        return false;
      }

      var rows =
        window.getMembers();

      if (!Array.isArray(rows)) {
        return false;
      }

      function rowIdentity(row) {
        if (
          !row ||
          typeof row !== 'object'
        ) {
          return {
            login: '',
            uid: ''
          };
        }

        return {
          login:
            safeText(
              row.signupId ||
              row.login_id ||
              row.loginId
            ).toLowerCase(),

          uid:
            safeText(
              row.authUserId ||
              row.auth_user_id ||
              row.supabaseAuthUserId
            ).toLowerCase()
        };
      }

      var matchMode = '';

      if (key && uid) {
        var exactFound = false;
        var loginOnlyFound = false;
        var uidOnlyFound = false;
        var conflictFound = false;

        rows.forEach(function (row) {
          var identity =
            rowIdentity(row);

          if (
            identity.login === key &&
            identity.uid === uid
          ) {
            exactFound = true;
            return;
          }

          if (identity.login === key) {
            if (!identity.uid) {
              loginOnlyFound = true;
            } else if (identity.uid !== uid) {
              conflictFound = true;
            }
          }

          if (identity.uid === uid) {
            if (!identity.login) {
              uidOnlyFound = true;
            } else if (identity.login !== key) {
              conflictFound = true;
            }
          }
        });

        if (exactFound) {
          matchMode = 'exact';
        } else if (conflictFound) {
          return false;
        } else if (
          loginOnlyFound &&
          !uidOnlyFound
        ) {
          matchMode = 'login';
        } else if (
          uidOnlyFound &&
          !loginOnlyFound
        ) {
          matchMode = 'uid';
        } else {
          return false;
        }
      } else if (key) {
        matchMode = 'login';
      } else {
        matchMode = 'uid';
      }

      var changed = false;

      rows =
        rows.map(function (row) {
          if (
            !row ||
            typeof row !== 'object'
          ) {
            return row;
          }

          var identity =
            rowIdentity(row);

          var matched =
            matchMode === 'exact'
              ? (
                  identity.login === key &&
                  identity.uid === uid
                )
              : matchMode === 'login'
                ? identity.login === key
                : identity.uid === uid;

          if (!matched) {
            return row;
          }

          var cleaned =
            Object.assign({}, row);

          [
            'testPassword',
            'passwordSet',
            'passwordChangedAt',
            'adminRole',
            'adminRoleUpdatedAt',
            'adminRoleUpdatedBy'
          ].forEach(function (field) {
            if (
              Object.prototype.hasOwnProperty.call(
                cleaned,
                field
              )
            ) {
              delete cleaned[field];
              changed = true;
            }
          });

          return cleaned;
        });

      if (changed) {
        window.setMembers(rows);
      }

      return changed;
    } catch (error) {
      console.warn(
        '[SitePass Step79] legacy auth field cleanup skipped',
        error
      );
      return false;
    }
  }

  function replaceServerProfile(member) {
    try {
      if (
        typeof window.getMembers !==
          'function' ||
        typeof window.setMembers !==
          'function'
      ) {
        return member;
      }

      var key =
        safeText(
          member &&
          (
            member.signupId ||
            member.login_id ||
            member.loginId
          )
        ).toLowerCase();

      var uid =
        safeText(
          member &&
          (
            member.authUserId ||
            member.auth_user_id ||
            member.supabaseAuthUserId
          )
        ).toLowerCase();

      var rows =
        window.getMembers();

      if (!Array.isArray(rows)) {
        rows = [];
      }

      rows =
        rows.filter(function (row) {
          if (
            !row ||
            typeof row !== 'object'
          ) {
            return true;
          }

          var rowLogin =
            safeText(
              row.signupId ||
              row.login_id ||
              row.loginId
            ).toLowerCase();

          var rowUid =
            safeText(
              row.authUserId ||
              row.auth_user_id ||
              row.supabaseAuthUserId
            ).toLowerCase();

          return !(
            (key && rowLogin === key) ||
            (uid && rowUid === uid)
          );
        });

      rows.push(member);
      window.setMembers(rows);

    } catch (error) {
      console.warn(
        '[SitePass Step79] server member profile replace skipped',
        error
      );
    }

    return member;
  }

  function touchLogin(member) {
    if (!member) return member;

    var authUid =
      safeText(
        member.authUserId ||
        member.auth_user_id ||
        member.supabaseAuthUserId ||
        member.userId ||
        ''
      );

    if (authUid) {
      try {
        var rows =
          typeof window.getMembers ===
            'function'
            ? window.getMembers()
            : [];

        var index =
          Array.isArray(rows)
            ? rows.findIndex(
                function (row) {
                  var rowUid =
                    safeText(
                      row &&
                      (
                        row.authUserId ||
                        row.auth_user_id ||
                        row.supabaseAuthUserId ||
                        row.userId
                      )
                    );

                  return (
                    !!rowUid &&
                    rowUid === authUid
                  );
                }
              )
            : -1;

        if (index >= 0) {
          rows[index] =
            Object.assign(
              {},
              rows[index],
              {
                lastLoginAt:
                  new Date().toISOString(),

                lastLoginMethod:
                  member.signupMethod ||
                  member.provider ||
                  'SitePass 로그인'
              }
            );

          if (
            typeof window.setMembers ===
            'function'
          ) {
            window.setMembers(rows);
          }
        }
      } catch (error) {}

      return member;
    }

    try {
      if (
        typeof window.updateMemberLastLogin ===
        'function'
      ) {
        return (
          window.updateMemberLastLogin(
            member,
            member.signupMethod ||
            member.provider ||
            'SitePass 로그인'
          ) ||
          member
        );
      }
    } catch (error) {}

    return member;
  }

  window.SitePassMemberProfileStore = {
    readProfiles: readProfiles,
    writeProfiles: writeProfiles,
    memberKeys: memberKeys,
    getCachedProfile: getCachedProfile,
    storeSignupProfile: storeSignupProfile,
    removeLegacyAuthFields:
      removeLegacyAuthFields,
    replaceServerProfile:
      replaceServerProfile,
    touchLogin: touchLogin
  };
})();
