(function () {
  'use strict';

  var data = window.FLOOD_DATA;
  if (!data) return;

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var B0 = data.model.intercept;
  var B_RAIN = data.model.coef_rain;
  var B_DUR = data.model.coef_dur;
  var JAKARTA_MEAN = data.model.jakarta_mean;

  var selKota = qs('#f-sel-kota');
  var selKec = qs('#f-sel-kec');
  var selKel = qs('#f-sel-kel');
  var selRw = qs('#f-sel-rw');

  var rainRange = qs('#f-sim-rain');
  var rainNum = qs('#f-sim-rain-num');
  var durRange = qs('#f-sim-dur');
  var durNum = qs('#f-sim-dur-num');

  function populateSelect(sel, keys, preferred) {
    sel.innerHTML = keys.map(function (k) {
      return '<option value="' + k + '">' + k + '</option>';
    }).join('');
    if (preferred && keys.indexOf(preferred) !== -1) {
      sel.value = preferred;
    } else if (keys.length) {
      sel.value = keys[0];
    }
  }

  function onKotaChange(prefKec, prefKel, prefRw) {
    var kotaObj = data.cities[selKota.value];
    if (!kotaObj) return;
    var kecKeys = Object.keys(kotaObj.kecamatan).sort();
    populateSelect(selKec, kecKeys, prefKec);
    onKecChange(prefKel, prefRw);
  }

  function onKecChange(prefKel, prefRw) {
    var kotaObj = data.cities[selKota.value];
    var kecObj = kotaObj && kotaObj.kecamatan[selKec.value];
    if (!kecObj) return;
    var kelKeys = Object.keys(kecObj).sort();
    populateSelect(selKel, kelKeys, prefKel);
    onKelChange(prefRw);
  }

  function onKelChange(prefRw) {
    var kotaObj = data.cities[selKota.value];
    var kecObj = kotaObj && kotaObj.kecamatan[selKec.value];
    var kelObj = kecObj && kecObj[selKel.value];
    if (!kelObj) return;
    var rwKeys = Object.keys(kelObj).sort();
    populateSelect(selRw, rwKeys, prefRw);
    updateSimulation();
  }

  function getTier(cm) {
    if (cm > 150) return { key: 'evakuasi', label: 'STATUS: EVAKUASI! (> 150 cm)', cls: 'status-banner status-evakuasi' };
    if (cm > 70) return { key: 'bahaya', label: 'STATUS: BAHAYA (70 to 150 cm)', cls: 'status-banner status-bahaya' };
    if (cm > 20) return { key: 'waspada', label: 'STATUS: WASPADA (20 to 70 cm)', cls: 'status-banner status-waspada' };
    return { key: 'aman', label: 'STATUS: AMAN (0 to 20 cm)', cls: 'status-banner status-aman' };
  }

  function updateSimulation() {
    if (!selKota || !rainRange || !durRange) return;
    var rain = Math.max(0, Math.min(500, Number(rainRange.value) || 0));
    var dur = Math.max(0, Math.min(600, Number(durRange.value) || 0));

    var kota = selKota.value;
    var kec = selKec.value;
    var kel = selKel.value;
    var rw = selRw.value;

    var kotaObj = data.cities[kota];
    var rwObj = kotaObj && kotaObj.kecamatan[kec] && kotaObj.kecamatan[kec][kel] && kotaObj.kecamatan[kec][kel][rw];
    if (!rwObj) return;

    var predBase = Math.max(0, B0 + B_RAIN * rain + B_DUR * dur);
    var factorRw = Math.max(0.8, Math.min(rwObj.mean / JAKARTA_MEAN, 1.5));
    var finalPred = predBase * factorRw;

    qs('#f-target-label').textContent = kel + ' (RW ' + rw + '), ' + kec + ', ' + kota;
    qs('#f-pred-cm').textContent = finalPred.toFixed(1);
    qs('#f-pred-base').textContent = predBase.toFixed(1) + ' cm';
    qs('#f-rw-factor').textContent = factorRw.toFixed(2) + 'x';
    qs('#f-rw-mean').textContent = rwObj.mean.toFixed(1) + ' cm (' + rwObj.n + ' events)';

    var tier = getTier(finalPred);
    var banner = qs('#f-status-banner');
    if (banner) {
      banner.textContent = tier.label;
      banner.className = tier.cls;
    }

    qsa('[data-flood-tier]').forEach(function (el) {
      if (el.getAttribute('data-flood-tier') === tier.key) {
        el.setAttribute('aria-current', 'true');
      } else {
        el.removeAttribute('aria-current');
      }
    });

    // Update Choropleth Map Polygons & City Readouts
    qsa('#f-choropleth [data-city]').forEach(function (poly) {
      var cName = poly.getAttribute('data-city');
      var cInfo = data.cities[cName];
      var cPred = predBase * (cInfo ? cInfo.factor : 1);
      var ratio = Math.min(1, Math.max(0.08, cPred / 150));
      var isSelected = cName === kota;
      poly.setAttribute('fill', isSelected ? '#F5A524' : '#6F86A6');
      poly.setAttribute('fill-opacity', (0.18 + ratio * 0.68).toFixed(2));
      poly.setAttribute('stroke', isSelected ? '#F5A524' : '#0D1015');
      poly.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
    });

    qsa('[data-city-pred]').forEach(function (row) {
      var cName = row.getAttribute('data-city-pred');
      var cInfo = data.cities[cName];
      var cPred = predBase * (cInfo ? cInfo.factor : 1);
      var valSpan = qs('[data-city-val]', row);
      if (valSpan) valSpan.textContent = cPred.toFixed(1) + ' cm';
      row.style.borderColor = (cName === kota) ? 'var(--amber)' : 'var(--rule)';
      row.style.background = (cName === kota) ? 'var(--amber-tint)' : 'var(--bg-console)';
    });
  }

  if (selKota) {
    var kotaKeys = Object.keys(data.cities).sort();
    populateSelect(selKota, kotaKeys, 'Jakarta Barat');
    onKotaChange('Cengkareng', 'Cengkareng Barat', '01');

    selKota.addEventListener('change', function () { onKotaChange(); });
    selKec.addEventListener('change', function () { onKecChange(); });
    selKel.addEventListener('change', function () { onKelChange(); });
    selRw.addEventListener('change', updateSimulation);
  }

  function syncRain(val) {
    var v = Math.max(0, Math.min(500, Number(val) || 0));
    rainRange.value = v;
    rainNum.value = v;
    updateSimulation();
  }

  function syncDur(val) {
    var v = Math.max(0, Math.min(600, Number(val) || 0));
    durRange.value = v;
    durNum.value = v;
    updateSimulation();
  }

  if (rainRange && rainNum) {
    rainRange.addEventListener('input', function () { syncRain(rainRange.value); });
    rainNum.addEventListener('input', function () { syncRain(rainNum.value); });
  }
  if (durRange && durNum) {
    durRange.addEventListener('input', function () { syncDur(durRange.value); });
    durNum.addEventListener('input', function () { syncDur(durNum.value); });
  }

  // Click city on map or city readout card to select that Kota
  qsa('#f-choropleth [data-city], [data-city-pred]').forEach(function (el) {
    el.addEventListener('click', function () {
      var cName = el.getAttribute('data-city') || el.getAttribute('data-city-pred');
      if (cName && selKota && selKota.value !== cName) {
        selKota.value = cName;
        onKotaChange();
      }
    });
  });

  // Scenario preset buttons
  qsa('[data-flood-scenario]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var parts = btn.getAttribute('data-flood-scenario').split('|');
      var kota = parts[0], kec = parts[1], kel = parts[2], rw = parts[3];
      var rain = Number(parts[4]), dur = Number(parts[5]);
      if (selKota) {
        selKota.value = kota;
        onKotaChange(kec, kel, rw);
      }
      rainRange.value = rain;
      rainNum.value = rain;
      durRange.value = dur;
      durNum.value = dur;
      updateSimulation();
    });
  });

  /* ==========================================================================
   * 2. INTERACTIVE MODEL FIT & SCATTER EXPLORER
   * ========================================================================== */
  var scatterSvg = qs('#f-scatter-svg');
  var scatterAxis = qs('#f-scatter-axis');
  var scatterCity = qs('#f-scatter-city');
  var scatterReadout = qs('#f-scatter-readout');

  function renderScatter() {
    if (!scatterSvg) return;
    var mode = scatterAxis ? scatterAxis.value : 'rain';
    var cityFilter = scatterCity ? scatterCity.value : '';

    var W = 680, H = 320;
    var padL = 52, padR = 22, padT = 20, padB = 42;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var xMax = mode === 'rain' ? 220 : (mode === 'dur' ? 380 : 120);
    var yMax = 120;
    var xLabel = mode === 'rain' ? 'Rainfall intensity (rainFall_mm)' : (mode === 'dur' ? 'Rain duration (rainDuration_minutes)' : 'Predicted water level (cm)');
    var yLabel = 'Actual recorded waterLevel_cm';

    var pts = data.sample.filter(function (s) {
      return !cityFilter || s[0] === cityFilter;
    });

    function sx(v) { return padL + Math.min(1, Math.max(0, v / xMax)) * plotW; }
    function sy(v) { return padT + plotH - Math.min(1, Math.max(0, v / yMax)) * plotH; }

    var grid = '';
    [0, 30, 60, 90, 120].forEach(function (yv) {
      var y = sy(yv);
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke="#1F2735" stroke-width="1"/>';
      grid += '<text x="' + (padL - 8) + '" y="' + (y + 4).toFixed(1) + '" fill="#687385" font-family="JetBrains Mono, monospace" font-size="10.5" text-anchor="end">' + yv + '</text>';
    });

    var xTicks = mode === 'rain' ? [0, 50, 100, 150, 200] : (mode === 'dur' ? [0, 90, 180, 270, 360] : [0, 30, 60, 90, 120]);
    xTicks.forEach(function (xv) {
      var x = sx(xv);
      grid += '<line x1="' + x.toFixed(1) + '" y1="' + padT + '" x2="' + x.toFixed(1) + '" y2="' + (H - padB) + '" stroke="#1F2735" stroke-width="1"/>';
      grid += '<text x="' + x.toFixed(1) + '" y="' + (H - padB + 16) + '" fill="#687385" font-family="JetBrains Mono, monospace" font-size="10.5" text-anchor="middle">' + xv + '</text>';
    });

    // Regression line
    var x1 = 0, x2 = xMax, y1 = 0, y2 = 0;
    if (mode === 'rain') {
      // Mean duration across dataset ~ 134 min
      y1 = B0 + B_RAIN * x1 + B_DUR * 134;
      y2 = B0 + B_RAIN * x2 + B_DUR * 134;
    } else if (mode === 'dur') {
      // Mean rain across dataset ~ 71 mm
      y1 = B0 + B_RAIN * 71 + B_DUR * x1;
      y2 = B0 + B_RAIN * 71 + B_DUR * x2;
    } else {
      y1 = x1;
      y2 = x2;
    }

    var regLine = '<line x1="' + sx(x1).toFixed(1) + '" y1="' + sy(y1).toFixed(1) + '" x2="' + sx(x2).toFixed(1) + '" y2="' + sy(y2).toFixed(1) + '" stroke="#F5A524" stroke-width="2" stroke-dasharray="5 3"/>';

    var circles = pts.map(function (s, idx) {
      var xv = mode === 'rain' ? s[4] : (mode === 'dur' ? s[5] : s[7]);
      var yv = s[6];
      var color = s[0] === (selKota && selKota.value) ? '#F5A524' : '#6F86A6';
      return '<circle class="scatter-dot" data-pt-idx="' + idx + '" cx="' + sx(xv).toFixed(1) + '" cy="' + sy(yv).toFixed(1) + '" r="3.6" fill="' + color + '" opacity="0.72"/>';
    }).join('');

    var labels =
      '<text x="' + (padL + plotW / 2) + '" y="' + (H - 6) + '" fill="#9BA5B4" font-size="11.5" text-anchor="middle">' + xLabel + '</text>' +
      '<text transform="translate(14,' + (padT + plotH / 2) + ') rotate(-90)" fill="#9BA5B4" font-size="11.5" text-anchor="middle">' + yLabel + '</text>';

    scatterSvg.innerHTML = grid + regLine + circles + labels;

    qsa('.scatter-dot', scatterSvg).forEach(function (dot) {
      var idx = Number(dot.getAttribute('data-pt-idx'));
      var rec = pts[idx];
      if (!rec) return;
      function showPoint() {
        if (scatterReadout) {
          scatterReadout.innerHTML =
            '<span class="mono" style="color:var(--amber)">' + rec[2] + ' (RW ' + rec[3] + ')</span>, ' + rec[1] + ', ' + rec[0] + ' (' + rec[8] + ')' +
            ' | Rain: <strong class="mono" style="color:var(--ink)">' + rec[4] + ' mm</strong>, Duration: <strong class="mono" style="color:var(--ink)">' + rec[5] + ' min</strong>' +
            ' | Actual: <strong class="mono" style="color:var(--ink)">' + rec[6] + ' cm</strong> | Model: <strong class="mono" style="color:var(--amber)">' + rec[7] + ' cm</strong>';
        }
      }
      dot.addEventListener('mouseenter', showPoint);
      dot.addEventListener('click', function () {
        showPoint();
        if (selKota) {
          selKota.value = rec[0];
          onKotaChange(rec[1], rec[2], rec[3]);
          rainRange.value = Math.round(rec[4]);
          rainNum.value = Math.round(rec[4]);
          durRange.value = Math.round(rec[5]);
          durNum.value = Math.round(rec[5]);
          updateSimulation();
        }
      });
    });
  }

  if (scatterAxis) scatterAxis.addEventListener('change', renderScatter);
  if (scatterCity) scatterCity.addEventListener('change', renderScatter);
  renderScatter();
})();
