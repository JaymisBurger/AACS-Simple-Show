import { useMemo, useState } from 'react';
import { TierBadge } from './TierBadge.jsx';
import './ShowForm.css';

const tiers = ['platinum', 'gold', 'silver', 'bronze'];
const timezoneOptions = [
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Los_Angeles',
  'America/Phoenix',
  'UTC'
];

const emptyForm = {
  name: '',
  venueName: '',
  venueAddress: '',
  startDate: '',
  endDate: '',
  vendorSelectionDeadline: '',
  timezone: 'America/Denver',
  status: 'draft',
  selectionPaused: false,
  tierWindows: {
    platinum: '',
    gold: '',
    silver: '',
    bronze: ''
  }
};

export function showToFormState(show) {
  if (!show) return emptyForm;

  return {
    name: show.name || '',
    venueName: show.venueName || '',
    venueAddress: show.venueAddress || '',
    startDate: show.startDate || '',
    endDate: show.endDate || '',
    vendorSelectionDeadline: show.vendorSelectionDeadline || '',
    timezone: show.timezone || 'America/Denver',
    status: show.status || 'draft',
    selectionPaused: Boolean(show.selectionPaused),
    tierWindows: tiers.reduce((result, tier) => {
      result[tier] = show.tierWindows?.[tier]?.opensAt || '';
      return result;
    }, {})
  };
}

export function ShowForm({ initialShow, mode, apiErrors = {}, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState(() => showToFormState(initialShow));
  const frontendErrors = useMemo(() => validateForm(formData), [formData]);
  const canPublish = Object.keys(validateForm(formData, true)).length === 0;

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function updateTierWindow(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      tierWindows: {
        ...current.tierWindows,
        [name]: value
      }
    }));
  }

  function submitWithStatus(status) {
    if (status === 'published' && !canPublish) {
      return;
    }

    if (status === 'archived' && !window.confirm('Archive this show?')) {
      return;
    }

    onSubmit({ ...formData, status }, status);
  }

  return (
    <form className="show-form" onSubmit={(event) => event.preventDefault()}>
      <section className="form-section">
        <h2>Show Information</h2>
        <div className="form-grid">
          <Field label="Show name" name="name" errors={errorsFor('name', apiErrors, frontendErrors)}>
            <input name="name" onChange={updateField} value={formData.name} />
          </Field>
          <Field label="Venue name" name="venueName" errors={errorsFor('venueName', apiErrors, frontendErrors)}>
            <input name="venueName" onChange={updateField} value={formData.venueName} />
          </Field>
          <Field label="Venue address" name="venueAddress" errors={errorsFor('venueAddress', apiErrors, frontendErrors)} wide>
            <input name="venueAddress" onChange={updateField} value={formData.venueAddress} />
          </Field>
          <Field label="Start date" name="startDate" errors={errorsFor('startDate', apiErrors, frontendErrors)}>
            <input name="startDate" onChange={updateField} type="date" value={formData.startDate} />
          </Field>
          <Field label="End date" name="endDate" errors={errorsFor('endDate', apiErrors, frontendErrors)}>
            <input name="endDate" onChange={updateField} type="date" value={formData.endDate} />
          </Field>
          <Field
            label="Vendor selection deadline"
            name="vendorSelectionDeadline"
            errors={errorsFor('vendorSelectionDeadline', apiErrors, frontendErrors)}
          >
            <DateTimeInput
              name="vendorSelectionDeadline"
              onChange={(value) => setFormData((current) => ({ ...current, vendorSelectionDeadline: value }))}
              value={formData.vendorSelectionDeadline}
            />
          </Field>
          <Field label="Timezone" name="timezone" errors={errorsFor('timezone', apiErrors, frontendErrors)}>
            <select name="timezone" onChange={updateField} value={formData.timezone}>
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" name="status" errors={errorsFor('status', apiErrors, frontendErrors)}>
            <select name="status" onChange={updateField} value={formData.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <label className="checkbox-field">
            <input
              checked={formData.selectionPaused}
              name="selectionPaused"
              onChange={updateField}
              type="checkbox"
            />
            Selection paused
          </label>
        </div>
      </section>
      <FormActions
        canPublish={canPublish}
        isSubmitting={isSubmitting}
        mode={mode}
        onSubmit={submitWithStatus}
        status={formData.status}
      />

      <section className="form-section">
        <div className="section-heading">
          <h2>Tier Selection Schedule</h2>
          <p>Platinum opens first, followed by Gold, Silver, then Bronze.</p>
        </div>
        <div className="tier-window-grid">
          {tiers.map((tier) => (
            <Field key={tier} label={<TierBadge tier={tier} />} name={tier} errors={errorsFor(tier, apiErrors, frontendErrors)}>
              <DateTimeInput
                name={tier}
                onChange={(value) => updateTierWindow({ target: { name: tier, value } })}
                value={formData.tierWindows[tier]}
              />
            </Field>
          ))}
        </div>
        {apiErrors.tierWindows ? <FieldErrors errors={apiErrors.tierWindows} /> : null}
      </section>

      <FormActions
        canPublish={canPublish}
        isSubmitting={isSubmitting}
        mode={mode}
        onSubmit={submitWithStatus}
        status={formData.status}
      />
    </form>
  );
}

function FormActions({ canPublish, isSubmitting, mode, onSubmit, status }) {
  return (
    <div className="form-actions">
      <button
        className="button secondary"
        disabled={isSubmitting}
        onClick={() => onSubmit('draft')}
        type="button"
      >
        Save as Draft
      </button>
      {mode === 'edit' ? (
        <button
          className="button secondary"
          disabled={isSubmitting}
          onClick={() => onSubmit(status)}
          type="button"
        >
          Save Changes
        </button>
      ) : null}
      <button
        className="button primary"
        disabled={isSubmitting || !canPublish}
        onClick={() => onSubmit('published')}
        type="button"
      >
        Publish Show
      </button>
    </div>
  );
}

function DateTimeInput({ name, value, onChange }) {
  const { date, time } = splitDateTime(value);

  function updateDate(event) {
    onChange(combineDateTime(event.target.value, time));
  }

  function updateTime(event) {
    onChange(combineDateTime(date, event.target.value));
  }

  return (
    <div className="datetime-field">
      <input
        aria-label={`${name} date`}
        onChange={updateDate}
        type="date"
        value={date}
      />
      <input
        aria-label={`${name} time`}
        onChange={updateTime}
        type="time"
        value={time}
      />
    </div>
  );
}

function splitDateTime(value) {
  if (!value) return { date: '', time: '00:00' };
  const [date, time = '00:00'] = String(value).split('T');
  return { date, time: time.slice(0, 5) || '00:00' };
}

function combineDateTime(date, time) {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

function Field({ label, name, errors, children, wide = false }) {
  return (
    <label className={`form-field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
      <FieldErrors errors={errors} />
    </label>
  );
}

function FieldErrors({ errors }) {
  if (!errors?.length) return null;
  return (
    <span className="field-error">
      {errors.map((error) => (
        <span key={error}>{error}</span>
      ))}
    </span>
  );
}

function errorsFor(field, apiErrors, frontendErrors) {
  return [...(frontendErrors[field] || []), ...(apiErrors[field] || [])];
}

function validateForm(formData, requirePublishReady = false) {
  const errors = {};

  if (requirePublishReady) {
    if (!formData.name) errors.name = ['Show name is required before publishing.'];
    if (!formData.venueName) errors.venueName = ['Venue name is required before publishing.'];
    if (!formData.startDate) errors.startDate = ['Start date is required before publishing.'];
    if (!formData.endDate) errors.endDate = ['End date is required before publishing.'];
    if (!formData.timezone) errors.timezone = ['Timezone is required before publishing.'];
    if (tiers.some((tier) => !formData.tierWindows[tier])) {
      errors.tierWindows = ['All four tier opening times are required before publishing.'];
    }
  }

  if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
    errors.endDate = ['End date cannot be before start date.'];
  }

  if (
    formData.vendorSelectionDeadline &&
    formData.startDate &&
    formData.vendorSelectionDeadline.slice(0, 10) > formData.startDate
  ) {
    errors.vendorSelectionDeadline = ['Vendor selection deadline cannot be after the show starts.'];
  }

  tiers.forEach((tier) => {
    if (
      formData.vendorSelectionDeadline &&
      formData.tierWindows[tier] &&
      formData.tierWindows[tier] > formData.vendorSelectionDeadline
    ) {
      errors[tier] = [`${tier} opening time cannot be after the vendor selection deadline.`];
    }
  });

  for (let index = 1; index < tiers.length; index += 1) {
    const previousTier = tiers[index - 1];
    const tier = tiers[index];

    if (
      formData.tierWindows[previousTier] &&
      formData.tierWindows[tier] &&
      formData.tierWindows[tier] <= formData.tierWindows[previousTier]
    ) {
      errors[tier] = [`${tier} must open after ${previousTier}.`];
    }
  }

  return errors;
}
