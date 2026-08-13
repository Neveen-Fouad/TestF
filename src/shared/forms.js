export const today = () => {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
};

export function constrainFutureDate(input) {
  if (input) input.min = today();
}

export function constrainDateRange(form, startName, endName) {
  const start = form?.elements[startName];
  const end = form?.elements[endName];
  if (!start || !end) return;
  constrainFutureDate(start);
  const sync = () => {
    end.min = start.value || today();
    const valid = !start.value || !end.value || end.value > start.value;
    end.setCustomValidity(valid ? "" : "Choose a date after the start date.");
  };
  start.addEventListener("change", sync);
  end.addEventListener("change", sync);
  sync();
}
