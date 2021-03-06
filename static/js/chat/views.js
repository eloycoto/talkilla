/* global app, Backbone, _, jQuery */
/**
 * Talkilla Backbone views.
 */
/* jshint unused: vars */
(function(app, Backbone, _, $) {
  "use strict";

  /**
   * Chat View (overall)
   */
  app.views.ChatView = Backbone.View.extend({
    initialize: function(options) {
      options = options || {};
      if (!options.call)
        throw new Error("missing parameter: call");

      this.call = options.call;

      this.call.on('change:otherUser', function(to) {
        document.title = to.get("otherUser");
      });
    }
  });

  /**
   * Call offer view
   */
  app.views.CallOfferView = Backbone.View.extend({
    el: "#offer",

    events: {
      'click .btn-accept': 'accept'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.call)
        throw new Error("missing parameter: call");

      this.call = options.call;

      options.call.on('change:state', function(to, from) {
        if (to === "incoming")
          this.$el.show();
        else if (from === "incoming")
          this.$el.hide();

        this.render();
      }.bind(this));
    },

    accept: function(event) {
      if (event)
        event.preventDefault();

      this.call.accept();
    },

    render: function() {
      // XXX: update caller's avatar, though we'd need to access otherUser
      //      as a User model instance
      return this;
    }
  });

  /**
   * Video/Audio Call View
   */
  app.views.CallView = Backbone.View.extend({

    events: {
      'click .btn-hangup a': 'hangup'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.call)
        throw new Error("missing parameter: call");
      if (!options.el)
        throw new Error("missing parameter: el");

      this.call = options.call;
      this.call.media.on('change:localStream', this._displayLocalVideo, this);
      this.call.media.on('change:remoteStream', this._displayRemoteVideo, this);

      options.call.on('change:state', function(to) {
        if (to === "pending")
          this.pending();
        else if (to === "terminated")
          this.terminated();
      }, this);
    },

    hangup: function(event) {
      if (event)
        event.preventDefault();

      window.close(); // XXX: actually terminate the call and leave the
                      // conversation window open (eg. for text chat)
    },

    pending: function() {
      this.$el.show();
      this.$('.btn-video').hide();
      this.$('.btn-audio').hide();
      this.$('.btn-hangup').show();
    },

    terminated: function() {
      this.$el.hide();
      this.$('.btn-video').show();
      this.$('.btn-audio').show();
      this.$('.btn-hangup').hide();
    },

    _displayLocalVideo: function() {
      var localVideo = this.$('#local-video')[0];
      if (!localVideo)
        return this;
      var localStream = this.call.media.get("localStream");
      localVideo.mozSrcObject = localStream;
      localVideo.play();
      return this;
    },

    _displayRemoteVideo: function() {
      var remoteVideo = this.$('#remote-video')[0];
      var remoteStream = this.call.media.get("remoteStream");

      remoteVideo.mozSrcObject = remoteStream;
      remoteVideo.play();
      return this;
    }
  });

  /**
   * Text chat entry view.
   */
  app.views.TextChatEntryView = Backbone.View.extend({
    tagName: 'li',

    template: _.template('<strong><%= nick %>:</strong> <%= message %>'),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  /**
   * Text chat conversation view.
   */
  app.views.TextChatView = Backbone.View.extend({
    el: '#textchat', // XXX: uncouple the selector from this view

    me: undefined,

    events: {
      'submit form': 'send'
    },

    initialize: function(options) {
      if (!options.call)
        throw new Error("missing parameter: call");
      if (!options.collection)
        throw new Error("missing parameter: collection");

      this.collection = options.collection;
      this.call = options.call;
      this.media = options.call.media;

      app.port.on('talkilla.call-start', function(data) {
        this.me = data.caller; // If I'm receiving this, I'm the caller
      }, this);

      app.port.on('talkilla.call-incoming', function(data) {
        this.me = data.callee; // If I'm receiving this, I'm the callee
      }, this);

      this.collection.on('add', this.render, this);

      this.media.on('dc.in.ready', function() {
        this.$('input').removeAttr('disabled');
      }, this);

      this.call.on('change:state', function(to) {
        if (to === "pending")
          this.$el.show();
        else if (to === "terminated")
          this.$el.hide();
      }.bind(this));
    },

    send: function(event) {
      event.preventDefault();
      var $input = this.$('form input[name="message"]');
      var message = $input.val().trim();
      $input.val('');
      this.collection.newEntry({
        nick: this.me,
        message: message
      });
    },

    render: function() {
      var $ul = this.$('ul').empty();
      this.collection.each(function(entry) {
        var view = new app.views.TextChatEntryView({model: entry});
        $ul.append(view.render().$el);
      });
      return this;
    }
  });
})(app, Backbone, _, jQuery);
