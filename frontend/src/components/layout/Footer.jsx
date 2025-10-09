import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <h3 className="text-2xl font-bold text-primary-400 mb-4">
              PrimeTrade.ai
            </h3>
            <p className="text-gray-300 mb-4">
              Advanced cryptocurrency trading strategies platform for professional traders.
              Built with enterprise-level architecture and security.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com" className="text-gray-400 hover:text-white">
                GitHub
              </a>
              <a href="https://twitter.com" className="text-gray-400 hover:text-white">
                Twitter
              </a>
              <a href="https://linkedin.com" className="text-gray-400 hover:text-white">
                LinkedIn
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="/strategies" className="hover:text-white">Trading Strategies</a></li>
              <li><a href="/dashboard" className="hover:text-white">Dashboard</a></li>
              <li><a href="/api/docs" className="hover:text-white">API Documentation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white">Documentation</a></li>
              <li><a href="#" className="hover:text-white">Support</a></li>
              <li><a href="#" className="hover:text-white">Status</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-400">
            © 2024 PrimeTrade.ai. Built for Backend Developer Intern position.
          </p>
          <div className="flex space-x-6 text-sm text-gray-400 mt-4 sm:mt-0">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;