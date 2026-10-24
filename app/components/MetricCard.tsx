'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend
}: MetricCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {icon && (
              <span className="text-2xl" role="img" aria-label={title}>
                {icon}
              </span>
            )}
            <h3 className="text-body font-medium text-neutral-700">
              {title}
            </h3>
          </div>

          <div className="text-4xl font-bold text-mono text-neutral-900 mb-1">
            {value}
          </div>

          {subtitle && (
            <p className="text-caption text-neutral-500">
              {subtitle}
            </p>
          )}

          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-caption font-medium ${
                trend.value >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {trend.value >= 0 ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-caption text-neutral-500">
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}













