(function () {
  'use strict';

  function CISNEActivationPrompt(options) {
    this.options = options || {};
    this.requiredModules = ['taxonomy', 'sla', 'notifications', 'permissions', 'reports'];
  }

  CISNEActivationPrompt.prototype.ensureActivator = function () {
    if (!window.cisneActivator) {
      throw new Error('CISNE Platform Activator nao foi encontrado. Inclua /cisne_platform_activator.js antes.');
    }
    return window.cisneActivator;
  };

  CISNEActivationPrompt.prototype.validateModules = function (status) {
    var modules = (status && status.modules) || {};
    var missing = [];
    this.requiredModules.forEach(function (moduleName) {
      if (modules[moduleName] !== 'ATIVO') {
        missing.push(moduleName);
      }
    });
    return {
      ok: missing.length === 0,
      missing: missing
    };
  };

  CISNEActivationPrompt.prototype.runTests = function () {
    var activator = this.ensureActivator();
    var status = activator.getSystemStatus();
    var moduleValidation = this.validateModules(status);

    var results = [];
    results.push({
      name: 'Ativador carregado',
      ok: !!activator
    });
    results.push({
      name: 'Modulos obrigatorios ativos',
      ok: moduleValidation.ok,
      details: moduleValidation.ok ? 'Todos ativos' : 'Faltando: ' + moduleValidation.missing.join(', ')
    });
    results.push({
      name: 'Permissoes do usuario',
      ok: Array.isArray(status.permissions) && status.permissions.length > 0
    });
    results.push({
      name: 'SLA carregado',
      ok: !!status.slaPolicies && Object.keys(status.slaPolicies).length >= 4
    });
    results.push({
      name: 'Templates de relatorio',
      ok: Array.isArray(status.reportTemplates) && status.reportTemplates.length > 0
    });

    var passed = results.filter(function (test) { return test.ok; }).length;
    return {
      passed: passed,
      total: results.length,
      results: results,
      status: status
    };
  };

  CISNEActivationPrompt.prototype.printReport = function (report) {
    var summary = report || this.runTests();
    if (window.console && typeof window.console.group === 'function') {
      window.console.group('[CISNE] Relatorio de ativacao');
      window.console.info('Sucesso: ' + summary.passed + '/' + summary.total);
      window.console.table(summary.results);
      window.console.info('Status completo:', summary.status);
      window.console.groupEnd();
    }
    return summary;
  };

  CISNEActivationPrompt.prototype.activate = function () {
    var activator = this.ensureActivator();
    var status = activator.getSystemStatus();
    activator.showNotification('CISNE ativado com sucesso.', 'success');
    return status;
  };

  CISNEActivationPrompt.prototype.start = async function () {
    var activator = this.ensureActivator();
    var useAuto = window.confirm('Ativar modo automatico de inicializacao do CISNE?');
    if (useAuto) {
      window.localStorage.removeItem('cisne.disable.auto');
    } else {
      window.localStorage.setItem('cisne.disable.auto', 'true');
    }

    var report = this.runTests();
    this.printReport(report);
    activator.showNotification('Validacao concluida: ' + report.passed + '/' + report.total, report.passed === report.total ? 'success' : 'error');
    return report;
  };

  window.CISNEActivationPrompt = CISNEActivationPrompt;
})();
