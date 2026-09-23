(function(global){
  'use strict';

  var root = global.SitePassSupportV85 =
    global.SitePassSupportV85 || {};

  function messages(formatTime){
    var room = root.room;

    if (
      !room ||
      typeof room.rawMessages !== 'function'
    ) {
      return [];
    }

    var rows = room.rawMessages();

    var normalized = rows.map(function(item){
      var mine =
        String(
          item.senderType ||
          item.sender_type ||
          ''
        ) === 'member';

      return {
        id: String(
          item.messageId ||
          item.message_id ||
          ''
        ),

        deleteGroupId:
          'server-' +
          String(
            item.messageId ||
            item.message_id ||
            ''
          ),

        from: mine ? '나' : '관리자',
        kind: mine ? 'me' : 'admin',

        time:
          typeof formatTime === 'function'
            ? formatTime(
                item.createdAt ||
                item.created_at
              )
            : String(
                item.createdAt ||
                item.created_at ||
                ''
              ),

        text:
          item.messageText ||
          item.message_text ||
          '',

        deletable: false
      };
    });

    var unreadRemaining =
      room &&
      typeof room.unread === 'function'
        ? Math.max(
            0,
            Number(room.unread()) || 0
          )
        : 0;

    for (
      var index = normalized.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (
        normalized[index].kind !== 'admin'
      ) {
        continue;
      }

      normalized[index].unread =
        unreadRemaining > 0;

      normalized[index].read =
        unreadRemaining <= 0;

      if (unreadRemaining > 0) {
        unreadRemaining -= 1;
      }
    }

    return normalized;
  }

  root.ui = Object.freeze({
    messages: messages
  });
})(window);