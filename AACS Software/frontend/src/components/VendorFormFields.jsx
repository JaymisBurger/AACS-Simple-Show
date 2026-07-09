import { TierBadge } from './TierBadge.jsx';

const tiers = ['platinum', 'gold', 'silver', 'bronze'];

export function VendorFormFields({ formData, errors = {}, onChange, includeTier = false, tierReadOnly = false }) {
  return (
    <>
      <FieldError errors={errors.companyName} />
      <label>Company name<input name="companyName" onChange={onChange} value={formData.companyName || ''} /></label>
      <FieldError errors={errors.contactName} />
      <label>Contact name<input name="contactName" onChange={onChange} value={formData.contactName || ''} /></label>
      <label>Phone<input name="phone" onChange={onChange} value={formData.phone || ''} /></label>
      <FieldError errors={errors.website} />
      <label>Website<input name="website" onChange={onChange} placeholder="https://example.com" value={formData.website || ''} /></label>
      <label>Description<textarea name="description" onChange={onChange} value={formData.description || ''} /></label>
      {includeTier ? (
        tierReadOnly ? (
          <div className="readonly-tier">
            <span>Tier</span>
            <TierBadge tier={formData.tier} />
          </div>
        ) : (
          <label>Tier<select name="tier" onChange={onChange} value={formData.tier || 'bronze'}>{tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}</select></label>
        )
      ) : null}
    </>
  );
}

export function FieldError({ errors }) {
  return errors?.length ? <span className="field-error">{errors[0]}</span> : null;
}
