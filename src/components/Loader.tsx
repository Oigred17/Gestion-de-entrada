interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
  height?: number | string;
}

export default function Loader({
  message = 'Cargando datos...',
  fullScreen = false,
  height = 280,
}: LoaderProps) {
  return (
    <div
      className={`data-loader${fullScreen ? ' data-loader--fullscreen' : ''}`}
      style={fullScreen ? undefined : { minHeight: height }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="data-loader__anim">
        <div className="data-loader__bar" />
        <div className="data-loader__bar" />
        <div className="data-loader__bar" />
        <div className="data-loader__bar" />
        <div className="data-loader__bar" />
        <div className="data-loader__ball" />
      </div>
      {message ? <p className="data-loader__message">{message}</p> : null}
    </div>
  );
}
