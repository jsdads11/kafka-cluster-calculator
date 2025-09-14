import React, { useState, useEffect } from 'react';
import { Calculator, Download, BarChart3, List, Cloud, Server, DollarSign } from 'lucide-react';

const KafkaClusterCalculator = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [calculations, setCalculations] = useState({});

  // Business domains configuration
  const businessDomains = {
    cust: {
      name: 'Customer',
      color: 'from-blue-500 to-blue-600',
      subdomains: ['marketing', 'customer_engagement_and_personalisation', 'customer_management', 'sales', 'loyalty']
    },
    comm: {
      name: 'Commercial',
      color: 'from-green-500 to-green-600',
      subdomains: ['trading_and_revenue_management', 'network_and_scheduling', 'commercial_partnerships', 'passenger_reservation_and_management', 'product_and_offer_management']
    },
    corp: {
      name: 'Corporate',
      color: 'from-purple-500 to-purple-600',
      subdomains: ['people', 'facilities', 'finance_and_risk', 'legal_and_compliance']
    },
    aops: {
      name: 'Airline Operations',
      color: 'from-red-500 to-red-600',
      subdomains: ['airport_operations', 'engineering_and_safety', 'scheduling_and_crew_rostering', 'aircraft_and_crew_management', 'flight_operations']
    }
  };

  const environments = ['dev', 'tst', 'pre', 'prd'];
  const environmentLabels = {
    dev: 'Development',
    tst: 'Testing',
    pre: 'Pre-Production',
    prd: 'Production'
  };

  const environmentColors = {
    dev: 'bg-green-500',
    tst: 'bg-yellow-500',
    pre: 'bg-orange-500',
    prd: 'bg-red-500'
  };

  // Confluent Cloud ECKU pricing (GBP)
  const eckuPricing = {
    dev: 0.85,
    tst: 0.85,
    pre: 1.20,
    prd: 1.20
  };

  // Initial form state
  const [formData, setFormData] = useState(() => {
    const initial = {};
    Object.keys(businessDomains).forEach(domain => {
      initial[domain] = {};
      environments.forEach(env => {
        initial[domain][env] = {
          messagesPerSecond: '',
          averageMessageSize: '',
          retentionDays: '',
          replicationFactor: env === 'prd' ? 3 : 2,
          partitions: '',
          producerCount: '',
          consumerCount: '',
          peakLoadMultiplier: env === 'prd' ? 3 : 2
        };
      });
    });
    return initial;
  });

  // Calculate ECKU requirements
  const calculateECKU = (domain, env, data) => {
    const msgs = parseFloat(data.messagesPerSecond) || 0;
    const msgSize = parseFloat(data.averageMessageSize) || 0;
    const retention = parseFloat(data.retentionDays) || 1;
    const replication = parseFloat(data.replicationFactor) || 2;
    const partitions = parseFloat(data.partitions) || 1;
    const peakMultiplier = parseFloat(data.peakLoadMultiplier) || 1;

    // Calculate throughput in MB/s
    const throughputMBps = (msgs * msgSize * peakMultiplier) / (1024 * 1024);
    
    // Calculate storage requirements in GB
    const dailyStorageGB = (msgs * msgSize * 86400) / (1024 * 1024 * 1024);
    const totalStorageGB = dailyStorageGB * retention * replication;
    
    // ECKU calculation based on Confluent's model
    const throughputECKUs = Math.max(throughputMBps / 1, throughputMBps * 2 / 2);
    const storageECKUs = totalStorageGB / 2500;
    const partitionECKUs = partitions / 4000;
    
    const totalECKUs = Math.max(throughputECKUs, storageECKUs) + partitionECKUs;
    const minimumECKUs = env === 'prd' ? 2 : 1;
    
    return Math.max(Math.ceil(totalECKUs), minimumECKUs);
  };

  // Calculate costs
  const calculateCosts = () => {
    const results = {};
    let totalCost = 0;
    
    Object.keys(businessDomains).forEach(domain => {
      results[domain] = {};
      let domainTotal = 0;
      
      environments.forEach(env => {
        const data = formData[domain][env];
        const eckus = calculateECKU(domain, env, data);
        const monthlyCost = eckus * eckuPricing[env] * 24 * 30;
        
        results[domain][env] = {
          eckus,
          monthlyCost,
          throughputMBps: ((parseFloat(data.messagesPerSecond) || 0) * (parseFloat(data.averageMessageSize) || 0) * (parseFloat(data.peakLoadMultiplier) || 1)) / (1024 * 1024),
          storageGB: ((parseFloat(data.messagesPerSecond) || 0) * (parseFloat(data.averageMessageSize) || 0) * 86400 * (parseFloat(data.retentionDays) || 1) * (parseFloat(data.replicationFactor) || 2)) / (1024 * 1024 * 1024)
        };
        
        domainTotal += monthlyCost;
      });
      
      results[domain].total = domainTotal;
      totalCost += domainTotal;
    });
    
    results.grandTotal = totalCost;
    setCalculations(results);
  };

  useEffect(() => {
    calculateCosts();
  }, [formData]);

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'input', label: 'Input', icon: Calculator },
    { id: 'results', label: 'Results', icon: Server },
    { id: 'topics', label: 'Topics', icon: List },
    { id: 'costs', label: 'Costs', icon: DollarSign }
  ];

  // Generate topic naming convention
  const generateTopicName = (domain, subdomain, dataType = 'events') => {
    return `${domain}.${subdomain.replace(/_/g, '-')}.${dataType}`;
  };

  // Handle input changes
  const handleInputChange = (domain, env, field, value) => {
    setFormData(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [env]: {
          ...prev[domain][env],
          [field]: value
        }
      }
    }));
  };

  // Export results
  const exportResults = () => {
    const exportData = {
      businessDomains,
      formData,
      calculations,
      timestamp: new Date().toISOString(),
      topicNamingConvention: 'domain.subdomain.datatype',
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kafka-cluster-sizing-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Confluent Apache Kafka Cluster Sizing Calculator</h1>
              <p className="text-gray-600">Optimise your airline Kafka infrastructure across business domains and environments</p>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white rounded-lg shadow-lg mb-6 p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
            <button
              onClick={exportResults}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </nav>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(businessDomains).map(([domainKey, domainData]) => (
                <div key={domainKey} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${domainData.color} text-white p-4`}>
                    <h3 className="text-lg font-bold">{domainData.name}</h3>
                    <p className="text-white/80 text-sm">({domainKey})</p>
                  </div>
                  <div className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      £{calculations[domainKey]?.total?.toFixed(2) || '0.00'}/mo
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {domainData.subdomains.length} subdomains
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Environment Pipeline</h2>
              <div className="flex items-center justify-between">
                {environments.map((env, index) => (
                  <React.Fragment key={env}>
                    <div className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-full ${environmentColors[env]} flex items-center justify-center text-white font-bold`}>
                        {env.toUpperCase()}
                      </div>
                      <div className="text-sm font-medium mt-2">{environmentLabels[env]}</div>
                    </div>
                    {index < environments.length - 1 && (
                      <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Total Monthly Cost</h3>
                  <p className="text-3xl font-bold text-green-600">
                    £{calculations.grandTotal?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total ECKUs</div>
                  <div className="text-lg font-bold">
                    {Object.values(calculations).reduce((total, domain) => {
                      if (typeof domain === 'object' && domain !== null) {
                        return total + environments.reduce((envTotal, env) => {
                          return envTotal + (domain[env]?.eckus || 0);
                        }, 0);
                      }
                      return total;
                    }, 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last saved: {window.kafkaCalculatorStore ? 'Recently' : 'Never'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {Object.entries(businessDomains).map(([domainKey, domainData]) => (
              <div key={domainKey} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className={`bg-gradient-to-r ${domainData.color} text-white p-4`}>
                  <h2 className="text-xl font-bold">{domainData.name}</h2>
                  <p className="text-white/80 text-sm">({domainKey})</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {environments.map(env => (
                    <div key={env} className="border rounded-lg p-3">
                      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${environmentColors[env]}`}></div>
                        {environmentLabels[env]}
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <input
                          type="number"
                          placeholder="Messages/sec"
                          value={formData[domainKey][env].messagesPerSecond}
                          onChange={e => handleInputChange(domainKey, env, 'messagesPerSecond', e.target.value)}
                          className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <input
                          type="number"
                          placeholder="Avg message size (bytes)"
                          value={formData[domainKey][env].averageMessageSize}
                          onChange={e => handleInputChange(domainKey, env, 'averageMessageSize', e.target.value)}
                          className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <input
                          type="number"
                          placeholder="Retention (days)"
                          value={formData[domainKey][env].retentionDays}
                          onChange={e => handleInputChange(domainKey, env, 'retentionDays', e.target.value)}
                          className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <input
                          type="number"
                          placeholder="Partitions"
                          value={formData[domainKey][env].partitions}
                          onChange={e => handleInputChange(domainKey, env, 'partitions', e.target.value)}
                          className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <input
                          type="number"
                          placeholder="Peak multiplier"
                          value={formData[domainKey][env].peakLoadMultiplier}
                          onChange={e => handleInputChange(domainKey, env, 'peakLoadMultiplier', e.target.value)}
                          className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <select
                          value={formData[domainKey][env].replicationFactor}
                          onChange={e => handleInputChange(domainKey, env, 'replicationFactor', e.target.value)}
                          className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={1}>Replication: 1</option>
                          <option value={2}>Replication: 2</option>
                          <option value={3}>Replication: 3</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(businessDomains).map(([domainKey, domainData]) => (
                <div key={domainKey} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${domainData.color} text-white p-4`}>
                    <h3 className="text-lg font-bold">{domainData.name} Cluster Sizing</h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Environment</th>
                            <th className="text-right p-2">ECKUs</th>
                            <th className="text-right p-2">Throughput</th>
                            <th className="text-right p-2">Storage</th>
                            <th className="text-right p-2">Cost/mo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {environments.map(env => {
                            const envData = calculations[domainKey]?.[env];
                            return (
                              <tr key={env} className="border-b hover:bg-gray-50">
                                <td className="p-2 font-medium flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${environmentColors[env]}`}></div>
                                  {environmentLabels[env]}
                                </td>
                                <td className="p-2 text-right">{envData?.eckus || 0}</td>
                                <td className="p-2 text-right">{envData?.throughputMBps?.toFixed(2) || 0} MB/s</td>
                                <td className="p-2 text-right">{envData?.storageGB?.toFixed(1) || 0} GB</td>
                                <td className="p-2 text-right font-medium">£{envData?.monthlyCost?.toFixed(2) || '0.00'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Topic Naming Convention & Structure</h2>
            
            <div className="mb-6 bg-blue-50 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2">Naming Convention</h3>
              <p className="text-blue-700"><code className="bg-blue-200 px-2 py-1 rounded">domain.subdomain.datatype</code></p>
              <p className="text-sm text-blue-600 mt-2">Where domain is abbreviated (cust, comm, corp, aops), subdomain uses underscores replaced with hyphens, and datatype describes the content (events, commands, snapshots, etc.)</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(businessDomains).map(([domainKey, domainData]) => (
                <div key={domainKey} className="border rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">{domainData.name} ({domainKey})</h3>
                  
                  <div className="space-y-3">
                    {domainData.subdomains.map(subdomain => (
                      <div key={subdomain} className="bg-gray-50 rounded p-3">
                        <h4 className="font-medium text-gray-700 mb-2">{subdomain.replace(/_/g, ' ')}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Events:</span>
                            <code className="bg-white px-2 py-1 rounded border text-xs">
                              {generateTopicName(domainKey, subdomain, 'events')}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Commands:</span>
                            <code className="bg-white px-2 py-1 rounded border text-xs">
                              {generateTopicName(domainKey, subdomain, 'commands')}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Snapshots:</span>
                            <code className="bg-white px-2 py-1 rounded border text-xs">
                              {generateTopicName(domainKey, subdomain, 'snapshots')}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                Detailed Cost Analysis
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {environments.map(env => (
                  <div key={env} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border-l-4 border-blue-500">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${environmentColors[env]}`}></div>
                      {environmentLabels[env]}
                    </h3>
                    <p className="text-xl font-bold text-blue-600">
                      £{Object.keys(businessDomains).reduce((total, domain) => {
                        return total + (calculations[domain]?.[env]?.monthlyCost || 0);
                      }, 0).toFixed(2)}/mo
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Domain</th>
                      {environments.map(env => (
                        <th key={env} className="text-right p-3">{environmentLabels[env]}</th>
                      ))}
                      <th className="text-right p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(businessDomains).map(([domainKey, domainData]) => (
                      <tr key={domainKey} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{domainData.name}</td>
                        {environments.map(env => (
                          <td key={env} className="p-3 text-right">
                            £{calculations[domainKey]?.[env]?.monthlyCost?.toFixed(2) || '0.00'}
                          </td>
                        ))}
                        <td className="p-3 text-right font-bold">
                          £{calculations[domainKey]?.total?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-gray-50">
                      <td className="p-3 font-bold">Total</td>
                      {environments.map(env => (
                        <td key={env} className="p-3 text-right font-bold">
                          £{Object.keys(businessDomains).reduce((total, domain) => {
                            return total + (calculations[domain]?.[env]?.monthlyCost || 0);
                          }, 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="p-3 text-right font-bold text-lg">
                        £{calculations.grandTotal?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Cost Breakdown by ECKU Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">ECKU Pricing (GBP per hour)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Development/Testing:</span>
                      <span>£{eckuPricing.dev}/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staging/Production:</span>
                      <span>£{eckuPricing.pre}/hour</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Total ECKU Usage</h4>
                  <div className="space-y-2 text-sm">
                    {environments.map(env => (
                      <div key={env} className="flex justify-between">
                        <span>{environmentLabels[env]}:</span>
                        <span>
                          {Object.keys(businessDomains).reduce((total, domain) => {
                            return total + (calculations[domain]?.[env]?.eckus || 0);
                          }, 0)} ECKUs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KafkaClusterCalculator;