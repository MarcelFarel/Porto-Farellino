(function () {
  'use strict';

  var data = window.GROCERY_DATA;
  if (!data) return;

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Build lookup maps from dimensions
  var locById = {};
  data.locationdimension.forEach(function (d) { locById[d.location_id] = d; });
  var prodById = {};
  data.productdimension.forEach(function (d) { prodById[d.product_id] = d; });
  var custById = {};
  data.customerdimension.forEach(function (d) { custById[d.customer_id] = d; });
  var timeById = {};
  data.timedimension.forEach(function (d) { timeById[d.time_id] = d; });

  // Hydrate 1,000 fact rows for fast filtering & joining
  var rows = data.salesfact.map(function (r) {
    var loc = locById[r[12]] || {};
    var prod = prodById[r[13]] || {};
    var cust = custById[r[14]] || {};
    var tm = timeById[r[15]] || {};
    return {
      invoice_id: r[0],
      unit_price: r[1],
      quantity: r[2],
      tax_five_percent: r[3],
      sales: r[4],
      Date: r[5],
      Time: r[6],
      payment: r[7],
      cogs: r[8],
      gross_margin_percentage: r[9],
      gross_income: r[10],
      rating: r[11],
      location_id: r[12],
      product_id: r[13],
      customer_id: r[14],
      time_id: r[15],
      branch: loc.branch,
      city: loc.city,
      product_line: prod.product_line,
      customer_type: cust.customer_type,
      gender: cust.gender,
      month: tm.month,
      day: tm.day,
      year: tm.year,
      day_name: tm.day_name,
      quarter: tm.quarter
    };
  });

  function fmtCurrency(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtInt(n) {
    return n.toLocaleString('en-US');
  }

  /* ==========================================================================
   * 1. INTERACTIVE BI DASHBOARD
   * ========================================================================== */
  var fCity = qs('#g-filter-city');
  var fLine = qs('#g-filter-line');
  var fMonth = qs('#g-filter-month');
  var fCust = qs('#g-filter-cust');
  var fPay = qs('#g-filter-pay');
  var resetBtn = qs('#g-filter-reset');

  function renderDashboard() {
    if (!fCity) return;
    var cityVal = fCity.value;
    var lineVal = fLine.value;
    var monthVal = fMonth.value ? Number(fMonth.value) : 0;
    var custVal = fCust.value;
    var payVal = fPay.value;

    var filtered = rows.filter(function (r) {
      if (cityVal && r.city !== cityVal) return false;
      if (lineVal && r.product_line !== lineVal) return false;
      if (monthVal && r.month !== monthVal) return false;
      if (custVal && r.customer_type !== custVal) return false;
      if (payVal && r.payment !== payVal) return false;
      return true;
    });

    var totalRev = 0, totalGross = 0, totalQty = 0, ratingSum = 0;
    var byLine = {};
    data.productdimension.forEach(function (p) {
      byLine[p.product_line] = { sales: 0, gross: 0, count: 0, qty: 0 };
    });
    var byCity = {
      'Naypyitaw': { branch: 'Giza', sales: 0, count: 0 },
      'Yangon': { branch: 'Alex', sales: 0, count: 0 },
      'Mandalay': { branch: 'Cairo', sales: 0, count: 0 }
    };
    var byMonth = {
      1: { name: 'January', sales: 0, count: 0 },
      2: { name: 'February', sales: 0, count: 0 },
      3: { name: 'March', sales: 0, count: 0 }
    };
    var byCust = {
      'Member': { qty: 0, sales: 0, count: 0 },
      'Normal': { qty: 0, sales: 0, count: 0 }
    };

    filtered.forEach(function (r) {
      totalRev += r.sales;
      totalGross += r.gross_income;
      totalQty += r.quantity;
      ratingSum += r.rating;

      if (byLine[r.product_line]) {
        byLine[r.product_line].sales += r.sales;
        byLine[r.product_line].gross += r.gross_income;
        byLine[r.product_line].count += 1;
        byLine[r.product_line].qty += r.quantity;
      }
      if (byCity[r.city]) {
        byCity[r.city].sales += r.sales;
        byCity[r.city].count += 1;
      }
      if (byMonth[r.month]) {
        byMonth[r.month].sales += r.sales;
        byMonth[r.month].count += 1;
      }
      if (byCust[r.customer_type]) {
        byCust[r.customer_type].qty += r.quantity;
        byCust[r.customer_type].sales += r.sales;
        byCust[r.customer_type].count += 1;
      }
    });

    var avgRating = filtered.length ? (ratingSum / filtered.length) : 0;

    // Sort product lines descending by sales
    var sortedLines = Object.keys(byLine).map(function (k) {
      return { name: k, sales: byLine[k].sales, gross: byLine[k].gross, count: byLine[k].count };
    }).sort(function (a, b) { return b.sales - a.sales; });

    var topLine = sortedLines[0] && sortedLines[0].sales > 0 ? sortedLines[0] : null;
    var maxLineSales = topLine ? topLine.sales : 1;

    // Update KPI cards
    qs('#g-kpi-rev').textContent = fmtCurrency(totalRev);
    qs('#g-kpi-gross').textContent = 'Gross income: ' + fmtCurrency(totalGross);
    qs('#g-kpi-txns').textContent = fmtInt(filtered.length);
    qs('#g-kpi-units').textContent = fmtInt(totalQty) + ' units sold';
    qs('#g-kpi-rating').textContent = avgRating.toFixed(2) + ' / 10';
    qs('#g-kpi-rating-sub').textContent = filtered.length + ' rated invoices';
    qs('#g-kpi-top').textContent = topLine ? topLine.name : 'No matches';
    qs('#g-kpi-top-sub').textContent = topLine ? (fmtCurrency(topLine.sales) + ' (' + topLine.count + ' txns)') : '$0.00';
    qs('#g-match-count').textContent = fmtInt(filtered.length) + ' / 1,000 rows';

    // Render Product Line bars
    var lineContainer = qs('#g-chart-lines');
    lineContainer.innerHTML = sortedLines.map(function (item, i) {
      var pct = maxLineSales > 0 ? Math.max(2, (item.sales / maxLineSales) * 100) : 0;
      var isSelected = lineVal === item.name;
      var fillClass = (i === 0 || isSelected) ? 'bar-fill bar-fill-top' : 'bar-fill';
      return (
        '<button type="button" class="bar-item" data-pick-line="' + item.name + '" title="Click to filter by ' + item.name + '">' +
          '<span style="text-align:left;color:' + (i === 0 || isSelected ? 'var(--ink)' : 'var(--muted)') + ';font-weight:' + (i === 0 || isSelected ? '600' : '400') + '">' + item.name + '</span>' +
          '<span class="bar-track"><span class="' + fillClass + '" style="display:block;width:' + pct.toFixed(1) + '%"></span></span>' +
          '<span class="mono tnum" style="text-align:right;color:var(--ink)">' + fmtCurrency(item.sales) + '</span>' +
        '</button>'
      );
    }).join('');

    qsa('[data-pick-line]', lineContainer).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var picked = btn.getAttribute('data-pick-line');
        fLine.value = (fLine.value === picked) ? '' : picked;
        renderDashboard();
      });
    });

    // Render City bars
    var cityOrder = ['Naypyitaw', 'Yangon', 'Mandalay'];
    var maxCitySales = Math.max.apply(null, cityOrder.map(function (c) { return byCity[c].sales; })) || 1;
    var cityContainer = qs('#g-chart-cities');
    cityContainer.innerHTML = cityOrder.map(function (c) {
      var info = byCity[c];
      var pct = maxCitySales > 0 ? Math.max(2, (info.sales / maxCitySales) * 100) : 0;
      var active = cityVal === c;
      return (
        '<button type="button" class="bar-item" data-pick-city="' + c + '" title="Click to filter by ' + c + '">' +
          '<span style="text-align:left;color:' + (active ? 'var(--amber)' : 'var(--ink)') + ';font-weight:500">' + c + ' <span style="color:var(--muted);font-weight:400">(' + info.branch + ')</span></span>' +
          '<span class="bar-track"><span class="bar-fill ' + (active ? 'bar-fill-top' : '') + '" style="display:block;width:' + pct.toFixed(1) + '%"></span></span>' +
          '<span class="mono tnum" style="text-align:right;color:var(--ink)">' + fmtCurrency(info.sales) + '</span>' +
        '</button>'
      );
    }).join('');

    qsa('[data-pick-city]', cityContainer).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var picked = btn.getAttribute('data-pick-city');
        fCity.value = (fCity.value === picked) ? '' : picked;
        renderDashboard();
      });
    });

    // Render Monthly revenue
    var maxMonthSales = Math.max(byMonth[1].sales, byMonth[2].sales, byMonth[3].sales) || 1;
    qs('#g-chart-months').innerHTML = [1, 2, 3].map(function (m) {
      var info = byMonth[m];
      var pct = maxMonthSales > 0 ? Math.max(2, (info.sales / maxMonthSales) * 100) : 0;
      var active = monthVal === m;
      return (
        '<button type="button" class="bar-item" data-pick-month="' + m + '">' +
          '<span style="text-align:left;color:' + (active ? 'var(--amber)' : 'var(--ink)') + '">' + info.name + ' <span class="mono" style="font-size:11px;color:var(--muted)">(' + info.count + ')</span></span>' +
          '<span class="bar-track"><span class="bar-fill ' + (active ? 'bar-fill-top' : '') + '" style="display:block;width:' + pct.toFixed(1) + '%"></span></span>' +
          '<span class="mono tnum" style="text-align:right;color:var(--ink)">' + fmtCurrency(info.sales) + '</span>' +
        '</button>'
      );
    }).join('');

    qsa('[data-pick-month]', qs('#g-chart-months')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var picked = btn.getAttribute('data-pick-month');
        fMonth.value = (fMonth.value === picked) ? '' : picked;
        renderDashboard();
      });
    });

    // Render Customer segment split
    var memPct = totalQty > 0 ? (byCust.Member.qty / totalQty) * 100 : 0;
    var normPct = totalQty > 0 ? (byCust.Normal.qty / totalQty) * 100 : 0;
    qs('#g-cust-split').innerHTML =
      '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:0.35rem">' +
        '<span><strong style="color:var(--ink)">Member</strong>: ' + fmtInt(byCust.Member.qty) + ' units (' + memPct.toFixed(1) + '%)</span>' +
        '<span><strong style="color:var(--ink)">Normal</strong>: ' + fmtInt(byCust.Normal.qty) + ' units (' + normPct.toFixed(1) + '%)</span>' +
      '</div>' +
      '<div style="display:flex;height:10px;background:var(--bg-console);border:1px solid var(--rule);overflow:hidden">' +
        '<div style="width:' + memPct.toFixed(1) + '%;background:var(--amber)"></div>' +
        '<div style="width:' + normPct.toFixed(1) + '%;background:var(--steel)"></div>' +
      '</div>';

    // Render Sample Rows table (first 6 matching rows)
    var sampleBody = qs('#g-sample-tbody');
    if (sampleBody) {
      sampleBody.innerHTML = filtered.slice(0, 6).map(function (r) {
        return (
          '<tr>' +
            '<td class="mono" style="color:var(--ink)">' + r.invoice_id + '</td>' +
            '<td class="mono">' + r.Date + '</td>' +
            '<td>' + r.city + ' (' + r.branch + ')</td>' +
            '<td>' + r.product_line + '</td>' +
            '<td>' + r.customer_type + ' / ' + r.gender + '</td>' +
            '<td>' + r.payment + '</td>' +
            '<td class="num">' + r.quantity + '</td>' +
            '<td class="num" style="color:var(--ink)">' + fmtCurrency(r.sales) + '</td>' +
            '<td class="num">' + r.rating.toFixed(1) + '</td>' +
          '</tr>'
        );
      }).join('') || '<tr><td colspan="9" style="text-align:center;padding:1.25rem;color:var(--muted)">No invoices match the current filter combination.</td></tr>';
    }
  }

  [fCity, fLine, fMonth, fCust, fPay].forEach(function (el) {
    if (el) el.addEventListener('change', renderDashboard);
  });
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      fCity.value = '';
      fLine.value = '';
      fMonth.value = '';
      fCust.value = '';
      fPay.value = '';
      renderDashboard();
    });
  }
  renderDashboard();

  /* ==========================================================================
   * 2. INTERACTIVE SQL CONSOLE (sql.js SQLite WASM + Local Star-Schema Fallback)
   * ========================================================================== */
  var PRESET_QUERIES = {
    product_revenue: {
      title: 'Revenue by product line',
      sql:
        "SELECT p.product_line,\n" +
        "       COUNT(*) AS transactions,\n" +
        "       SUM(sf.quantity) AS units_sold,\n" +
        "       ROUND(SUM(sf.sales), 2) AS total_revenue,\n" +
        "       ROUND(SUM(sf.gross_income), 2) AS gross_income,\n" +
        "       ROUND(AVG(sf.rating), 2) AS avg_rating\n" +
        "FROM salesfact sf\n" +
        "JOIN productdimension p ON sf.product_id = p.product_id\n" +
        "GROUP BY p.product_line\n" +
        "ORDER BY total_revenue DESC;"
    },
    city_branch: {
      title: 'Branch & city performance',
      sql:
        "SELECT l.city,\n" +
        "       l.branch,\n" +
        "       COUNT(*) AS invoices,\n" +
        "       ROUND(SUM(sf.sales), 2) AS total_revenue,\n" +
        "       ROUND(AVG(sf.sales), 2) AS avg_ticket,\n" +
        "       ROUND(AVG(sf.rating), 2) AS avg_rating\n" +
        "FROM salesfact sf\n" +
        "JOIN locationdimension l ON sf.location_id = l.location_id\n" +
        "GROUP BY l.city, l.branch\n" +
        "ORDER BY total_revenue DESC;"
    },
    monthly_trend: {
      title: 'Monthly revenue trend',
      sql:
        "SELECT t.year,\n" +
        "       t.month,\n" +
        "       COUNT(DISTINCT t.full_date) AS active_days,\n" +
        "       COUNT(*) AS transactions,\n" +
        "       ROUND(SUM(sf.sales), 2) AS monthly_revenue,\n" +
        "       ROUND(SUM(sf.gross_income), 2) AS gross_income\n" +
        "FROM salesfact sf\n" +
        "JOIN timedimension t ON sf.time_id = t.time_id\n" +
        "GROUP BY t.year, t.month\n" +
        "ORDER BY t.month ASC;"
    },
    customer_segment: {
      title: 'Customer segment & gender',
      sql:
        "SELECT c.customer_type,\n" +
        "       c.gender,\n" +
        "       COUNT(*) AS transactions,\n" +
        "       SUM(sf.quantity) AS total_units,\n" +
        "       ROUND(SUM(sf.sales), 2) AS total_revenue,\n" +
        "       ROUND(AVG(sf.rating), 2) AS avg_rating\n" +
        "FROM salesfact sf\n" +
        "JOIN customerdimension c ON sf.customer_id = c.customer_id\n" +
        "GROUP BY c.customer_type, c.gender\n" +
        "ORDER BY total_revenue DESC;"
    },
    top_invoices: {
      title: 'Top 10 largest invoices',
      sql:
        "SELECT sf.invoice_id,\n" +
        "       sf.Date AS date,\n" +
        "       l.city,\n" +
        "       p.product_line,\n" +
        "       c.customer_type,\n" +
        "       sf.quantity,\n" +
        "       ROUND(sf.sales, 2) AS total_sales,\n" +
        "       sf.rating\n" +
        "FROM salesfact sf\n" +
        "JOIN locationdimension l ON sf.location_id = l.location_id\n" +
        "JOIN productdimension p ON sf.product_id = p.product_id\n" +
        "JOIN customerdimension c ON sf.customer_id = c.customer_id\n" +
        "ORDER BY sf.sales DESC\n" +
        "LIMIT 10;"
    }
  };

  var sqliteDb = null;
  var engineBadge = qs('#sql-engine-badge');
  var sqlInput = qs('#sql-editor-input');
  var sqlRunBtn = qs('#sql-run-btn');
  var sqlMeta = qs('#sql-result-meta');
  var sqlTableWrap = qs('#sql-result-wrap');

  // Local fallback executor for the 5 presets + basic SELECT queries when offline
  function executeFallbackSQL(sqlText) {
    var norm = sqlText.replace(/\s+/g, ' ').trim().toLowerCase();

    // Match against the 5 presets or custom table queries
    if (norm.indexOf('group by p.product_line') !== -1 || norm.indexOf('from productdimension') !== -1 && norm.indexOf('join') === -1) {
      if (norm.indexOf('join') === -1) {
        return {
          columns: ['product_id', 'product_line'],
          values: data.productdimension.map(function (d) { return [d.product_id, d.product_line]; })
        };
      }
      var map = {};
      rows.forEach(function (r) {
        if (!map[r.product_line]) map[r.product_line] = { n: 0, qty: 0, sales: 0, gross: 0, rSum: 0 };
        map[r.product_line].n++;
        map[r.product_line].qty += r.quantity;
        map[r.product_line].sales += r.sales;
        map[r.product_line].gross += r.gross_income;
        map[r.product_line].rSum += r.rating;
      });
      var vals = Object.keys(map).map(function (k) {
        var m = map[k];
        return [k, m.n, m.qty, Number(m.sales.toFixed(2)), Number(m.gross.toFixed(2)), Number((m.rSum / m.n).toFixed(2))];
      }).sort(function (a, b) { return b[3] - a[3]; });
      return {
        columns: ['product_line', 'transactions', 'units_sold', 'total_revenue', 'gross_income', 'avg_rating'],
        values: vals
      };
    }

    if (norm.indexOf('group by l.city') !== -1) {
      var cmap = {};
      rows.forEach(function (r) {
        var k = r.city;
        if (!cmap[k]) cmap[k] = { city: r.city, branch: r.branch, n: 0, sales: 0, rSum: 0 };
        cmap[k].n++;
        cmap[k].sales += r.sales;
        cmap[k].rSum += r.rating;
      });
      var cvals = Object.keys(cmap).map(function (k) {
        var m = cmap[k];
        return [m.city, m.branch, m.n, Number(m.sales.toFixed(2)), Number((m.sales / m.n).toFixed(2)), Number((m.rSum / m.n).toFixed(2))];
      }).sort(function (a, b) { return b[3] - a[3]; });
      return {
        columns: ['city', 'branch', 'invoices', 'total_revenue', 'avg_ticket', 'avg_rating'],
        values: cvals
      };
    }

    if (norm.indexOf('group by t.year, t.month') !== -1) {
      var mmap = {};
      rows.forEach(function (r) {
        var m = r.month;
        if (!mmap[m]) mmap[m] = { year: r.year, month: m, days: {}, n: 0, sales: 0, gross: 0 };
        mmap[m].days[r.Date] = true;
        mmap[m].n++;
        mmap[m].sales += r.sales;
        mmap[m].gross += r.gross_income;
      });
      var mvals = [1, 2, 3].map(function (m) {
        var o = mmap[m];
        return [o.year, o.month, Object.keys(o.days).length, o.n, Number(o.sales.toFixed(2)), Number(o.gross.toFixed(2))];
      });
      return {
        columns: ['year', 'month', 'active_days', 'transactions', 'monthly_revenue', 'gross_income'],
        values: mvals
      };
    }

    if (norm.indexOf('group by c.customer_type, c.gender') !== -1) {
      var gmap = {};
      rows.forEach(function (r) {
        var k = r.customer_type + '|' + r.gender;
        if (!gmap[k]) gmap[k] = { ct: r.customer_type, g: r.gender, n: 0, qty: 0, sales: 0, rSum: 0 };
        gmap[k].n++;
        gmap[k].qty += r.quantity;
        gmap[k].sales += r.sales;
        gmap[k].rSum += r.rating;
      });
      var gvals = Object.keys(gmap).map(function (k) {
        var o = gmap[k];
        return [o.ct, o.g, o.n, o.qty, Number(o.sales.toFixed(2)), Number((o.rSum / o.n).toFixed(2))];
      }).sort(function (a, b) { return b[4] - a[4]; });
      return {
        columns: ['customer_type', 'gender', 'transactions', 'total_units', 'total_revenue', 'avg_rating'],
        values: gvals
      };
    }

    if (norm.indexOf('order by sf.sales desc') !== -1 || norm.indexOf('from salesfact') !== -1) {
      var limitMatch = norm.match(/limit\s+(\d+)/);
      var lim = limitMatch ? Math.min(100, Number(limitMatch[1])) : 10;
      var sorted = rows.slice().sort(function (a, b) { return b.sales - a.sales; }).slice(0, lim);
      return {
        columns: ['invoice_id', 'date', 'city', 'product_line', 'customer_type', 'quantity', 'total_sales', 'rating'],
        values: sorted.map(function (r) {
          return [r.invoice_id, r.Date, r.city, r.product_line, r.customer_type, r.quantity, Number(r.sales.toFixed(2)), r.rating];
        })
      };
    }

    throw new Error('Offline SQL engine supports the 5 Star Schema preset queries and SELECT queries on salesfact. Connect to the internet to load full SQLite WebAssembly (sql.js) for arbitrary SQL syntax.');
  }

  function renderSQLResult(res, elapsedMs) {
    if (!res || !res.columns || !res.columns.length) {
      sqlMeta.textContent = 'Query executed in ' + elapsedMs.toFixed(1) + ' ms (0 rows)';
      sqlTableWrap.innerHTML = '<div style="padding:1rem;font-size:13px;color:var(--muted)">Query returned an empty result set.</div>';
      return;
    }
    sqlMeta.textContent = res.values.length + ' rows returned in ' + elapsedMs.toFixed(1) + ' ms';
    var thead = '<thead><tr>' + res.columns.map(function (c) {
      return '<th>' + c + '</th>';
    }).join('') + '</tr></thead>';
    var tbody = '<tbody>' + res.values.map(function (row) {
      return '<tr>' + row.map(function (val) {
        var isNum = typeof val === 'number';
        return '<td class="' + (isNum ? 'num' : '') + '" style="color:var(--ink)">' + (val === null ? 'NULL' : val) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    sqlTableWrap.innerHTML = '<table class="data-table">' + thead + tbody + '</table>';
  }

  function runCurrentSQL() {
    if (!sqlInput) return;
    var q = sqlInput.value.trim();
    if (!q) return;
    var t0 = performance.now();
    try {
      if (sqliteDb) {
        var out = sqliteDb.exec(q);
        var t1 = performance.now();
        renderSQLResult(out[0] || { columns: [], values: [] }, t1 - t0);
      } else {
        var res = executeFallbackSQL(q);
        var t2 = performance.now();
        renderSQLResult(res, t2 - t0);
      }
    } catch (err) {
      sqlMeta.textContent = 'SQL Error';
      sqlTableWrap.innerHTML = '<div style="padding:1rem;font-family:var(--font-mono);font-size:12.5px;color:var(--danger)">' + err.message + '</div>';
    }
  }

  qsa('[data-sql-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-sql-preset');
      var preset = PRESET_QUERIES[key];
      if (!preset) return;
      qsa('[data-sql-preset]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      sqlInput.value = preset.sql;
      runCurrentSQL();
    });
  });

  if (sqlRunBtn) {
    sqlRunBtn.addEventListener('click', runCurrentSQL);
  }
  if (sqlInput) {
    sqlInput.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCurrentSQL();
      }
    });
  }

  // Seed default preset immediately using fast in-memory engine
  if (sqlInput) {
    sqlInput.value = PRESET_QUERIES.product_revenue.sql;
    runCurrentSQL();
  }

  // Dynamically load sql.js WASM in background to upgrade to full SQLite grammar
  function initSqlWasm() {
    if (typeof window.initSqlJs !== 'function') return;
    window.initSqlJs({
      locateFile: function (file) {
        return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/' + file;
      }
    }).then(function (SQL) {
      var db = new SQL.Database();
      db.run(
        "CREATE TABLE customerdimension (customer_id INTEGER PRIMARY KEY, customer_type TEXT, gender TEXT);" +
        "CREATE TABLE locationdimension (location_id INTEGER PRIMARY KEY, branch TEXT, city TEXT);" +
        "CREATE TABLE productdimension (product_id INTEGER PRIMARY KEY, product_line TEXT);" +
        "CREATE TABLE timedimension (time_id INTEGER PRIMARY KEY, full_date TEXT, day INTEGER, month INTEGER, year INTEGER, day_name TEXT, quarter INTEGER);" +
        "CREATE TABLE salesfact (invoice_id TEXT, unit_price REAL, quantity INTEGER, tax_five_percent REAL, sales REAL, Date TEXT, Time TEXT, payment TEXT, cogs REAL, gross_margin_percentage REAL, gross_income REAL, rating REAL, location_id INTEGER, product_id INTEGER, customer_id INTEGER, time_id INTEGER);"
      );

      db.run("BEGIN TRANSACTION;");
      var stmtC = db.prepare("INSERT INTO customerdimension VALUES (?,?,?);");
      data.customerdimension.forEach(function (d) { stmtC.run([d.customer_id, d.customer_type, d.gender]); });
      stmtC.free();

      var stmtL = db.prepare("INSERT INTO locationdimension VALUES (?,?,?);");
      data.locationdimension.forEach(function (d) { stmtL.run([d.location_id, d.branch, d.city]); });
      stmtL.free();

      var stmtP = db.prepare("INSERT INTO productdimension VALUES (?,?);");
      data.productdimension.forEach(function (d) { stmtP.run([d.product_id, d.product_line]); });
      stmtP.free();

      var stmtT = db.prepare("INSERT INTO timedimension VALUES (?,?,?,?,?,?,?);");
      data.timedimension.forEach(function (d) { stmtT.run([d.time_id, d.full_date, d.day, d.month, d.year, d.day_name, d.quarter]); });
      stmtT.free();

      var stmtF = db.prepare("INSERT INTO salesfact VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);");
      data.salesfact.forEach(function (r) { stmtF.run(r); });
      stmtF.free();
      db.run("COMMIT;");

      sqliteDb = db;
      if (engineBadge) {
        engineBadge.textContent = 'SQLite WASM (sql.js) • 5 tables seeded';
        engineBadge.className = 'badge badge-ok';
      }
      runCurrentSQL();
    }).catch(function () {
      if (engineBadge) {
        engineBadge.textContent = 'In-Memory Star Schema Engine';
      }
    });
  }

  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js';
  script.async = true;
  script.onload = initSqlWasm;
  document.head.appendChild(script);
})();
