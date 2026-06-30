import * as repo from './operators.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export async function list(opts) {
  return repo.listOperators(opts);
}

export async function get(id) {
  const op = await repo.getOperator(id);
  if (!op) throw ApiError.notFound('Operator not found');
  return op;
}

export async function getWithSummary(id) {
  const operator = await get(id);
  const summary = await repo.operatorSummary(id);
  return { operator, summary };
}

const defaults = (d) => ({
  operator_name: d.operator_name,
  license_number: d.license_number ?? null,
  license_type: d.license_type ?? null,
  status: d.status ?? 'ACTIVE',
  country: d.country ?? 'Sierra Leone',
  contact_email: d.contact_email ?? null,
  logo_url: d.logo_url ?? null,
});

export async function create(data) {
  return repo.createOperator(defaults(data));
}

export async function update(id, data) {
  await get(id);
  return repo.updateOperator(id, defaults(data));
}

export async function remove(id) {
  await get(id);
  await repo.softDeleteOperator(id);
}
