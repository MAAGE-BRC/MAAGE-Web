module.exports = {
  apps: [
    // MAAGE Cluster
    {
      name: "dev.maage",
      script: "./p3-web",
      cwd: "/home/ccthomas/MAAGE/dev.maage/bin",
      instances: 3,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 7000
      },
      // max_memory_restart: "5G",
      restart_delay: 5000,
      autorestart: true,
      merge_logs: false,
      out_file: "/home/ccthomas/MAAGE/pm2-logs/maage.dev.out.log",
      error_file: "/home/ccthomas/MAAGE/pm2-logs/maage.dev.error.log",
    },
    {
      name: "test.maage",
      script: "./app.js",
      cwd: "/home/ccthomas/MAAGE/test-search-index-site",
      instances: 3,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 7010
      },
      // max_memory_restart: "",
      restart_delay: 5000,
      autorestart: true,
      merge_logs: false,
      out_file: "/home/ccthomas/MAAGE/pm2-logs/test.maage.out.log",
      error_file: "/home/ccthomas/MAAGE/pm2-logs/test.maage.error.log",
    },
    {
      name: "www.maage",
      script: "./app.js",
      cwd: "/home/ccthomas/MAAGE/www-search-index-site",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 7020
      },
      // max_memory_restart: "",
      restart_delay: 5000,
      autorestart: true,
      merge_logs: false,
      out_file: "/home/ccthomas/MAAGE/pm2-logs/www.maage.out.log",
      error_file: "/home/ccthomas/MAAGE/pm2-logs/www.maage.error.log",
    },

    // DXKB Cluster
    {
      name: "dxkb.theseed",
      script: "./p3-web",
      cwd: "/home/ccthomas/DXKB/dxkb.theseed/bin",
      instances: 3,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 7040
      },
      // max_memory_restart: "",
      restart_delay: 5000,
      autorestart: true,
      merge_logs: false,
      out_file: "/home/ccthomas/DXKB/pm2-logs/dxkb.theseed.out.log",
      error_file: "/home/ccthomas/DXKB/pm2-logs/dxkb.theseed.error.log",
    },
    // {
    //   name: "dev.dxkb",
    //   script: "./p3-web",
    //   cwd: "/home/ccthomas/DXKB/dev.dxkb/bin",
    //   instances: 3,
    //   exec_mode: "cluster",
    //   env: {
    //     NODE_ENV: "production",
    //     PORT: ""
    //   },
    //   // max_memory_restart: "",
    //   restart_delay: 5000,
    //   autorestart: true,
    //   merge_logs: false,
    //   out_file: "/home/ccthomas/DXKB/pm2-logs/dev.dxkb.out.log",
    //   error_file: "/home/ccthomas/DXKB/pm2-logs/dev.dxkb.error.log",
    // },
    // {
    //   name: "test.dxkb",
    //   script: "./app.js",
    //   cwd: "/home/ccthomas/DXKB/text.dxkb/bin",
    //   instances: 3,
    //   exec_mode: "cluster",
    //   env: {
    //     NODE_ENV: "production",
    //     PORT: ""
    //   },
    //   // max_memory_restart: "",
    //   restart_delay: 5000,
    //   autorestart: true,
    //   merge_logs: false,
    //   out_file: "/home/ccthomas/DXKB/pm2-logs/test.dxkb.out.log",
    //   error_file: "/home/ccthomas/DXKB/pm2-logs/test.dxkb.error.log",
    // },
    // {
    //   name: "www.dxkb",
    //   script: "./app.js",
    //   cwd: "/home/ccthomas/DXKB/www.dxkb/bin",
    //   instances: "max",
    //   exec_mode: "cluster",
    //   env: {
    //     NODE_ENV: "production",
    //     PORT: ""
    //   },
    //   // max_memory_restart: "",
    //   restart_delay: 5000,
    //   autorestart: true,
    //   merge_logs: false,
    //   out_file: "/home/ccthomas/DXKB/pm2-logs/www.dxkb.out.log",
    //   error_file: "/home/ccthomas/DXKB/pm2-logs/www.dxkb.error.log",
    // }
  ]
};