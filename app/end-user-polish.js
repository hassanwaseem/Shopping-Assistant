(function () {
  'use strict';

  function sectionByHeading(root, headingText) {
    return [...root.querySelectorAll('section')].find(
      (section) => section.querySelector('h3')?.textContent.trim() === headingText,
    );
  }

  function polishEndUserCopy() {
    const planHelp = document.querySelector('#view-plan .plan-controls + .help');
    if (planHelp) {
      planHelp.textContent =
        'Dietary pattern, cuisine and nutrition preferences guide suggestions. Review ingredient lists carefully when planning for allergies.';
    }

    const pantryHeader = document.querySelector('#view-pantry .view-header');
    if (pantryHeader) {
      const eyebrow = pantryHeader.querySelector('.eyebrow');
      const title = pantryHeader.querySelector('h2');
      const description = pantryHeader.querySelector('p:not(.eyebrow)');
      if (eyebrow) eyebrow.textContent = 'Household pantry';
      if (title) title.textContent = 'Keep track of what is already at home';
      if (description) {
        description.textContent =
          'Use exact amounts when you know them, or simple statuses such as plenty, low or out.';
      }
    }

    document.querySelectorAll('#view-pantry .pantry-name span').forEach((label) => {
      label.textContent = label.textContent.replace(' · updated locally', ' · household item');
    });

    const shopHeader = document.querySelector('#view-shop .view-header');
    if (shopHeader) {
      const title = shopHeader.querySelector('h2');
      const description = shopHeader.querySelector('p:not(.eyebrow)');
      if (title) title.textContent = 'Shop with a clear, editable list';
      if (description) {
        description.textContent =
          'Quantities already account for pantry items and remain easy to adjust before or during shopping.';
      }
    }

    const moreView = document.getElementById('view-more');
    if (moreView) {
      const header = moreView.querySelector('.view-header');
      const headerTitle = header?.querySelector('h2');
      const headerDescription = header?.querySelector('p:not(.eyebrow)');
      if (headerTitle) headerTitle.textContent = 'Household settings';
      if (headerDescription) {
        headerDescription.textContent =
          'Manage household profiles, nutrition targets, recipes and personal data.';
      }

      sectionByHeading(moreView, 'What this branch implements')?.remove();

      const dataSection = sectionByHeading(moreView, 'Data controls');
      if (dataSection) {
        const heading = dataSection.querySelector('h3');
        const description = dataSection.querySelector('.panel-header p');
        const exportButton = dataSection.querySelector('[data-action="export-data"]');
        const resetButton = dataSection.querySelector('[data-action="reset-data"]');
        if (heading) heading.textContent = 'Data and privacy';
        if (description) {
          description.textContent =
            'Download a household backup or clear the information saved in the meal planner.';
        }
        if (exportButton) exportButton.textContent = 'Download household backup';
        if (resetButton) resetButton.textContent = 'Clear household data';
      }
    }
  }

  const baseRenderAll = renderAll;
  renderAll = function renderAllForUsers() {
    baseRenderAll();
    polishEndUserCopy();
  };

  const baseShowToast = showToast;
  showToast = function showUserToast(message) {
    const replacements = {
      'Shared pantry imported into this browser.': 'Shared pantry imported.',
      'Checked items completed. Pantry purchase reconciliation is reserved for the backend phase.':
        'Checked items completed. Update pantry amounts when convenient.',
    };
    baseShowToast(replacements[message] || message);
  };

  const baseConfirmAction = confirmAction;
  confirmAction = function confirmForUsers(title, body, confirmLabel = 'Confirm') {
    if (title === 'Reset local meal planner?') {
      return baseConfirmAction(
        'Clear household data?',
        'This removes the current plan, pantry, profiles and shopping-list changes. This cannot be undone.',
        'Clear data',
      );
    }
    return baseConfirmAction(title, body, confirmLabel);
  };

  saveState = function saveUserState(message = 'Saved') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = document.getElementById('saveStatus');
    if (!status) return;
    status.textContent = message;
    clearTimeout(status._timer);
    status._timer = setTimeout(() => {
      status.textContent = 'Saved';
    }, 1300);
  };
})();
