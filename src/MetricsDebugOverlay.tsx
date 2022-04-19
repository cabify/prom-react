import { CSSProperties } from 'react';

import { useMetrics } from './MetricsContext';
import { MetricsLogger } from './MetricsLogger';

export interface MetricsDebugOverlayProps {
  /**
   * Add MetricsLogger to log metrics to console.
   */
  withLogger?: boolean;

  /**
   * Callback called when pressing close button. If not set, the close button won't be shown
   */
  onClose?: () => void;
}

const wrapperStyle: CSSProperties = {
  position: 'fixed',
  right: 10,
  bottom: 10,
  padding: '15px 10px',
  zIndex: 99999,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  minWidth: '250px',
  minHeight: '140px',
  borderRadius: 4,
  color: 'white',
  fontFamily: 'Roboto, sans-serif',
  fontSize: '1rem',
};

const titleStyle: CSSProperties = { fontWeight: 'bold', fontSize: '1.2rem' };
const sectionTitleStyle: CSSProperties = {
  fontWeight: 'bold',
  color: '#a0c4ff',
  margin: '4px 0',
  fontSize: '1rem',
};

const valueStyle: CSSProperties = {
  color: '#9bf6ff',
};

const MetricsDebugOverlay = ({
  withLogger,
  onClose,
}: MetricsDebugOverlayProps) => {
  const { navigationData } = useMetrics();

  return (
    <section className="prom-react-navigation-overlay" style={wrapperStyle}>
      {onClose && (
        <span
          onClick={() => {
            onClose();
          }}
          style={{ position: 'absolute', right: 5, top: 5, cursor: 'pointer' }}
        >
          x
        </span>
      )}
      <h2 style={titleStyle}>prom-react</h2>
      <h3 style={sectionTitleStyle}>Last navigation</h3>
      {navigationData ? (
        <ul style={{ marginLeft: 5 }}>
          <li>
            Pathname: <span style={valueStyle}>{navigationData.path}</span>
          </li>
          <li>
            Navigation type:{' '}
            <span style={valueStyle}>
              {navigationData.isFullPageNavigation ? 'Full page' : 'In app'}
            </span>
          </li>
          <li>
            Duration:{' '}
            <span
              style={
                navigationData.duration > 10000
                  ? { color: '#ffadad' }
                  : valueStyle
              }
            >
              {navigationData.duration.toFixed(2)}ms
            </span>
          </li>
          <li>
            TTU:{' '}
            <span style={valueStyle}>
              {navigationData.timeToUsable.toFixed(2)}ms
            </span>
          </li>
          <li>
            TTC:{' '}
            <span style={valueStyle}>
              {navigationData.timeToComplete.toFixed(2)}ms
            </span>
          </li>
        </ul>
      ) : (
        '-'
      )}
      {withLogger && <MetricsLogger />}
    </section>
  );
};

export { MetricsDebugOverlay };
