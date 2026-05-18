export default function AppImage({
  src,
  alt = "",
  fill: _fill,
  priority: _priority,
  quality: _quality,
  sizes: _sizes,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  ...props
}) {
  const resolvedSrc =
    typeof src === "string" ? src : src?.src || src?.default?.src || "";

  return <img src={resolvedSrc} alt={alt} {...props} />;
}
