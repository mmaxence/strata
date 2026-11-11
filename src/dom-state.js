/** Capture only properties owned by Strata, leaving unrelated application changes alone. */
export function captureDOMState(element, {styles = [], data = [], attributes = []} = {}) {
  // CSSOM writes normalize author formatting and create style="" attributes.
  // Restore the raw attribute only if no unrelated declaration changed meanwhile.
  const canRestoreStyleAttribute = typeof element.getAttribute === 'function' && typeof element.style.length === 'number';
  const styleSignature = () => JSON.stringify(Array.from(element.style).sort().map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]));
  const originalStyleAttribute = canRestoreStyleAttribute ? element.getAttribute('style') : null;
  const originalStyleSignature = canRestoreStyleAttribute ? styleSignature() : null;
  const savedStyles = styles.map(name => [name, element.style.getPropertyValue?.(name) ?? element.style[name] ?? '', element.style.getPropertyPriority?.(name) || '']);
  const savedData = data.map(name => [name, Object.hasOwn(element.dataset, name), element.dataset[name]]);
  const savedAttributes = attributes.map(name => [name, element.getAttribute?.(name) ?? element.attrs?.[name] ?? null]);
  return () => {
    for (const [name, value, priority] of savedStyles) {
      if (value) element.style.setProperty(name, value, priority);
      else element.style.removeProperty(name);
    }
    if (canRestoreStyleAttribute && styleSignature() === originalStyleSignature) {
      if (originalStyleAttribute === null) element.removeAttribute('style');
      else element.setAttribute('style', originalStyleAttribute);
    }
    for (const [name, present, value] of savedData) {
      if (present) element.dataset[name] = value;
      else delete element.dataset[name];
    }
    for (const [name, value] of savedAttributes) {
      if (value !== null) element.setAttribute(name, value);
      else if (element.removeAttribute) element.removeAttribute(name);
      else if (element.attrs) delete element.attrs[name];
    }
  };
}
