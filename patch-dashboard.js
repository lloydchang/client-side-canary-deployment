const fs = require('fs');
const path = require('path');

console.log('Patching dashboard.js to fix initialization error...');

try {
  const dashboardJsPath = path.join(__dirname, 'src/embed-dashboard/dashboard.js');
  
  if (!fs.existsSync(dashboardJsPath)) {
    console.error(`Dashboard.js not found at ${dashboardJsPath}`);
    process.exit(1);
  }
  
  // Read the file content
  let content = fs.readFileSync(dashboardJsPath, 'utf8');
  
  // Check if the file already contains our patched init function
  if (content.includes('__NEXT_LOADED_PAGES__&&Array.isArray')) {
    console.log('Dashboard.js already contains the patch. No changes needed.');
    process.exit(0);
  }
  
  // Replace the problematic initialization function
  // This targets the appended function that contains the error
  const problematicCode = /;[\s\r\n]*\(function\(\)\{[\s\S]*?window\.__NEXT_DASHBOARD_INIT__[\s\S]*?\}\)\(\);/;
  
  const safeInitFunction = `;(function(){
  // Safe initialization function with proper checks
  window.__NEXT_DASHBOARD_INIT__ = function(dashboardData) {
    try {
      // First make the data globally available (fallback mechanism)
      window.dashboardData = dashboardData;
      
      // Check if we have a global init function
      if (typeof window.initDashboard === 'function') {
        window.initDashboard(dashboardData);
        window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
        return;
      }
      
      // Safely check for Next.js loaded pages
      if (self.__NEXT_LOADED_PAGES__ && 
          Array.isArray(self.__NEXT_LOADED_PAGES__) && 
          self.__NEXT_LOADED_PAGES__.length > 0 &&
          Array.isArray(self.__NEXT_LOADED_PAGES__[0]) && 
          self.__NEXT_LOADED_PAGES__[0].length > 1) {
        
        const appModule = self.__NEXT_LOADED_PAGES__[0][1];
        if (appModule && typeof appModule.initDashboard === 'function') {
          appModule.initDashboard(dashboardData);
        }
      }
      
      // Trigger update event
      window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
      
      // Try hydration if available
      if (window.__NEXT_HYDRATE) {
        window.__NEXT_HYDRATE();
      }
    } catch (err) {
      console.error('Safe dashboard init error:', err);
      // Always make sure data is available
      window.dashboardData = dashboardData;
      window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
    }
  };

  // Update function
  window.__NEXT_DASHBOARD_UPDATE__ = function(dashboardData) {
    window.dashboardData = dashboardData;
    window.dispatchEvent(new CustomEvent('dashboard-data-updated'));
  };
})();`;
  
  if (problematicCode.test(content)) {
    // Replace the problematic function with our safe implementation
    content = content.replace(problematicCode, safeInitFunction);
    console.log('Successfully replaced initialization function');
  } else {
    // Append our safe implementation at the end of the file
    content = content + safeInitFunction;
    console.log('Appended safe initialization function to dashboard.js');
  }
  
  // Write the changes back to the file
  fs.writeFileSync(dashboardJsPath, content);
  console.log('Dashboard.js patched successfully!');

  console.log(`
Now try:
1. Clear your browser cache
2. Reload the page
3. Check if the dashboard loads correctly
`);
} catch (error) {
  console.error('Error patching dashboard.js:', error);
  process.exit(1);
}
