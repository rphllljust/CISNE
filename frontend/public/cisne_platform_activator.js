(function () {
  'use strict';

  var STORAGE_KEYS = {
    state: 'cisne.activator.state',
    orders: 'cisne.activator.orders'
  };

  var DEFAULT_SLA_POLICIES = {
    P1: { label: 'Critico', responseHours: 1, resolutionHours: 4 },
    P2: { label: 'Alto', responseHours: 4, resolutionHours: 24 },
    P3: { label: 'Medio', responseHours: 8, resolutionHours: 72 },
    P4: { label: 'Baixo', responseHours: 24, resolutionHours: 120 }
  };

  var ROLE_PERMISSIONS = {
    'Super Admin': ['*'],
    'Gerente de Operacoes': [
      'create_order',
      'view_dashboard',
      'generate_report',
      'manage_sla',
      'manage_notifications',
      'manage_permissions'
    ],
    'Analista Tecnico': ['create_order', 'view_dashboard', 'generate_report'],
    Visualizador: ['view_dashboard']
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function readJson(key, fallbackValue) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallbackValue;
      }
      return JSON.parse(raw);
    } catch (_error) {
      return fallbackValue;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // Ignore write failures and keep runtime state in memory.
    }
  }

  function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }
    try {
      var parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var decoded = window.atob(payload);
      return JSON.parse(decoded);
    } catch (_error) {
      return null;
    }
  }

  function CISNEPlatformActivator(options) {
    this.options = options || {};
    this.version = '1.0.0';
    this.startedAt = nowIso();
    this.listeners = new Map();
    this.moduleStatus = {
      taxonomy: 'ATIVO',
      sla: 'ATIVO',
      notifications: 'ATIVO',
      permissions: 'ATIVO',
      reports: 'ATIVO'
    };

    var persistedState = readJson(STORAGE_KEYS.state, {});
    this.slaPolicies = Object.assign({}, DEFAULT_SLA_POLICIES, persistedState.slaPolicies || {});
    this.reportTemplates = persistedState.reportTemplates || [
      'Relatorio de Atendimento',
      'Conformidade SLA',
      'Desempenho',
      'Auditoria'
    ];

    this.activeUser = persistedState.activeUser || this.resolveUserFromSession();
    this.userPermissions = this.resolvePermissions(this.activeUser.role);
    this.orders = readJson(STORAGE_KEYS.orders, []);

    this.attachActionDelegation();
    this.emit('event-activator-ready', this.getSystemStatus());
  }

  CISNEPlatformActivator.prototype.resolveUserFromSession = function () {
    var token = window.localStorage.getItem('oms.access_token');
    var payload = parseJwtPayload(token);
    if (!payload) {
      return {
        id: 'guest',
        name: 'Usuario Local',
        role: 'Visualizador',
        email: 'local@cisne.app'
      };
    }

    var roles = Array.isArray(payload.roles) ? payload.roles : [];
    var role = 'Visualizador';
    if (roles.includes('SUPER_ADMIN')) {
      role = 'Super Admin';
    } else if (roles.includes('OPERATIONS_MANAGER')) {
      role = 'Gerente de Operacoes';
    } else if (roles.includes('TECHNICIAN') || roles.includes('ATTENDANT')) {
      role = 'Analista Tecnico';
    }

    return {
      id: payload.sub || 'user',
      name: payload.fullName || payload.email || 'Usuario CISNE',
      role: role,
      email: payload.email || 'usuario@cisne.app'
    };
  };

  CISNEPlatformActivator.prototype.resolvePermissions = function (role) {
    return ROLE_PERMISSIONS[role] ? ROLE_PERMISSIONS[role].slice() : ['view_dashboard'];
  };

  CISNEPlatformActivator.prototype.persistState = function () {
    writeJson(STORAGE_KEYS.state, {
      activeUser: this.activeUser,
      slaPolicies: this.slaPolicies,
      reportTemplates: this.reportTemplates
    });
    writeJson(STORAGE_KEYS.orders, this.orders);
  };

  CISNEPlatformActivator.prototype.on = function (eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return this;
  };

  CISNEPlatformActivator.prototype.off = function (eventName, callback) {
    if (!this.listeners.has(eventName)) {
      return this;
    }
    this.listeners.get(eventName).delete(callback);
    return this;
  };

  CISNEPlatformActivator.prototype.emit = function (eventName, payload) {
    var callbacks = this.listeners.get(eventName);
    if (!callbacks) {
      return this;
    }
    callbacks.forEach(function (callback) {
      try {
        callback(payload);
      } catch (_error) {
        // Ignore callback failures.
      }
    });
    return this;
  };

  CISNEPlatformActivator.prototype.hasPermission = function (permission) {
    return (
      this.userPermissions.includes('*') ||
      this.userPermissions.includes(permission)
    );
  };

  CISNEPlatformActivator.prototype.showNotification = function (message, type) {
    var resolvedType = type || 'info';
    var container = document.getElementById('cisne-activator-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cisne-activator-toast-container';
      container.style.position = 'fixed';
      container.style.right = '16px';
      container.style.bottom = '16px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.style.padding = '10px 12px';
    toast.style.borderRadius = '10px';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.fontSize = '13px';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)';
    toast.style.maxWidth = '280px';
    toast.style.wordBreak = 'break-word';
    toast.style.background =
      resolvedType === 'success'
        ? '#15803d'
        : resolvedType === 'error'
          ? '#b91c1c'
          : '#1d4ed8';
    toast.textContent = message;

    container.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  };

  CISNEPlatformActivator.prototype.attachActionDelegation = function () {
    var self = this;
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      var actionable = target.closest('[data-action]');
      if (!actionable) {
        return;
      }
      var action = actionable.getAttribute('data-action');
      if (!action) {
        return;
      }
      self.handleAction(action, actionable, event);
    });
  };

  CISNEPlatformActivator.prototype.handleAction = function (action, element, event) {
    var actionMap = {
      'create-order': this.handleCreateServiceOrder.bind(this),
      'view-dashboard': this.handleViewDashboard.bind(this),
      'generate-report': this.handleGenerateReport.bind(this),
      'sla-settings': this.handleSlaSettings.bind(this),
      'permission-settings': this.handlePermissionSettings.bind(this),
      'notification-settings': this.handleNotificationSettings.bind(this)
    };

    var handler = actionMap[action];
    if (!handler) {
      return;
    }

    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    handler({ element: element });
  };

  CISNEPlatformActivator.prototype.handleCreateServiceOrder = function (input) {
    if (!this.hasPermission('create_order')) {
      this.showNotification('Permissao insuficiente para criar ordem.', 'error');
      return null;
    }

    var order = {
      id: 'OS-' + Date.now(),
      title: (input && input.title) || 'Ordem de servico criada via ativador',
      createdAt: nowIso(),
      createdBy: this.activeUser.id,
      status: 'OPEN',
      priority: 'P3'
    };
    this.orders.unshift(order);
    this.persistState();
    this.emit('event-order-created', order);
    this.showNotification('Ordem ' + order.id + ' criada com sucesso.', 'success');
    return order;
  };

  CISNEPlatformActivator.prototype.handleViewDashboard = function () {
    if (!this.hasPermission('view_dashboard')) {
      this.showNotification('Permissao insuficiente para acessar dashboard.', 'error');
      return;
    }
    this.emit('event-dashboard-opened', this.getSystemStatus());
    this.showNotification('Dashboard operacional ativo.', 'success');
  };

  CISNEPlatformActivator.prototype.handleGenerateReport = function () {
    if (!this.hasPermission('generate_report')) {
      this.showNotification('Permissao insuficiente para gerar relatorio.', 'error');
      return null;
    }
    var report = {
      id: 'REP-' + Date.now(),
      template: this.reportTemplates[0],
      generatedAt: nowIso(),
      generatedBy: this.activeUser.id
    };
    this.emit('event-report-generated', report);
    this.showNotification('Relatorio gerado: ' + report.id, 'success');
    return report;
  };

  CISNEPlatformActivator.prototype.handleSlaSettings = function () {
    if (!this.hasPermission('manage_sla')) {
      this.showNotification('Permissao insuficiente para SLA.', 'error');
      return;
    }
    this.emit('event-sla-settings-opened', this.slaPolicies);
    this.showNotification('Politicas de SLA carregadas.', 'success');
  };

  CISNEPlatformActivator.prototype.handlePermissionSettings = function () {
    if (!this.hasPermission('manage_permissions')) {
      this.showNotification('Permissao insuficiente para papeis.', 'error');
      return;
    }
    this.emit('event-permissions-opened', { role: this.activeUser.role, permissions: this.userPermissions.slice() });
    this.showNotification('Gestao de permissoes pronta.', 'success');
  };

  CISNEPlatformActivator.prototype.handleNotificationSettings = function () {
    if (!this.hasPermission('manage_notifications')) {
      this.showNotification('Permissao insuficiente para notificacoes.', 'error');
      return;
    }
    this.emit('event-notification-settings-opened', {
      channels: ['email', 'sms', 'in-app', 'webhook']
    });
    this.showNotification('Canais de notificacao disponiveis.', 'success');
  };

  CISNEPlatformActivator.prototype.updateActiveUser = function (user) {
    this.activeUser = Object.assign({}, this.activeUser, user || {});
    this.userPermissions = this.resolvePermissions(this.activeUser.role);
    this.persistState();
    this.emit('event-user-updated', {
      user: this.activeUser,
      permissions: this.userPermissions.slice()
    });
  };

  CISNEPlatformActivator.prototype.getSystemStatus = function () {
    return {
      version: this.version,
      startedAt: this.startedAt,
      modules: Object.assign({}, this.moduleStatus),
      user: Object.assign({}, this.activeUser),
      permissions: this.userPermissions.slice(),
      totalOrders: this.orders.length,
      slaPolicies: Object.assign({}, this.slaPolicies),
      reportTemplates: this.reportTemplates.slice()
    };
  };

  function autoBoot() {
    var searchParams = new URLSearchParams(window.location.search || '');
    var forceActivation = searchParams.get('activate') === 'true';
    var disableByStorage = window.localStorage.getItem('cisne.disable.auto') === 'true';
    var disableByGlobal = window.CISNE_DISABLE_AUTO === true;
    if (!forceActivation && (disableByGlobal || disableByStorage)) {
      return;
    }
    if (window.cisneActivator) {
      return;
    }
    window.cisneActivator = new CISNEPlatformActivator();
    if (window.console && typeof window.console.info === 'function') {
      window.console.info('[CISNE] Platform Activator ativo.', window.cisneActivator.getSystemStatus());
    }
  }

  window.CISNEPlatformActivator = CISNEPlatformActivator;
  autoBoot();
})();
