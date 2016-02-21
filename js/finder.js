/*
 * sources (re-implement basic finder and then add iterative functionality?):
 * - https://github.com/Dkendal/Moore-Neighbor_Contour_Tracer/blob/master/ContourTrace.cs
 * - http://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_Abeer_George_Ghuneim/moore.html
 */

function ContourFinder() {

    this.pixelsWidth; 	// pixels width
    this.pixelsHeight;	// pixels height
    this.pixels;				// pixels (single array of r,g,b,a values of image)
    this.fColor; // foreground color
    this.bColor; // background color
    this.threshold;
    this.maxContourPoints = 1500*100;
    this.allContours = [];

    this.offset4 = function(x, y) { return (y * this.pixelsWidth + x) * 4; }
    this.offset = function(x, y) { return (y * this.pixelsWidth + x) * 4; }

    this.getPixel = function(x, y) { return {
        r: this.pixels[this.offset4(x, y)],
        g: this.pixels[this.offset4(x, y) + 1],
        b: this.pixels[this.offset4(x, y) + 2],
        a: this.pixels[this.offset4(x, y) + 3]
    };};
    this.setPixel = function(x, y, pixel) {
        this.pixels[this.offset4(x, y)] = pixel[0];
        this.pixels[this.offset4(x, y) + 1] = pixel[1];
        this.pixels[this.offset4(x, y) + 2] = pixel[2];
        this.pixels[this.offset4(x, y) + 3] = pixel[3];
    };


    this.findContours = function(image,foregroundColor,backgroundColor,threshold, X, Y) {
        var w = this.pixelsWidth = image.width;
        var h = this.pixelsHeight = image.height;
        this.fColor = foregroundColor;
        this.bColor = backgroundColor;
        this.threshold = threshold;
        // create a new pixel array
        var imageCtx = image.getContext('2d');
        var imageData = imageCtx.getImageData(0,0,w, h);
        var pixels = this.pixels = _.cloneDeep(imageData.data);
        var prevValue = 0;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var pix = this.getPixel(x, y);
                var factor = ((pix.r * .3 + pix.g * .59 + pix.b * .11) );
                var value = (factor > threshold) ? foregroundColor : backgroundColor; // threshold

                this.setPixel(x, y, [value, value, value, pix.a]);
            }
        }
        var x= X, y = Y;
        var prevValue = -255;
        while (true) {
            var pix = this.getPixel(x, y);
            var value = pix.g;
            value = (value > threshold) ? foregroundColor : backgroundColor;
            // if we enter a foreGround color and red isn't 0 (already stored as contour)
            if(prevValue == backgroundColor && value == foregroundColor && pix.r != 0) {
                var points = this.followContour({ x: x+1, y: y });
                this.allContours.push(points);
                break;
            }

            this.setPixel(x, y, [pix.r, pix.g, pix.b, pix.a]);
            x = x-1;
            prevValue = value;
            if (x<0) {
                break;
            }
        }

        // copy the image data back onto the canvas
        imageCtx.putImageData(imageData, 0, 0); // at coords 0,0
    }




    this.followContour = function(startPoint) {
//		//console.log("followContour @",startPoint);
        var map = {};
        var points = []; // start new contour
        points.push(startPoint);
        var w = this.pixelsWidth;
        var point = startPoint;
        var numPoints = 0;

        // define neighborhood (with: x offset, y offset, index offset, next neighborhood element to check)
//		var neighborhood = [
//			[ 1,  0,  1,   7], // east
//			[ 1,  1,  w+1, 0], // south-east
//			[ 0,  1,  w,   1], // south
//			[-1,  1,  w-1, 2], // south-west
//			[-1,  0, -1,   3], // west
//			[-1, -1, -w-1, 4], // north-west
//			[ 0, -1, -w,   5], // north
//			[ 1, -1, -w+1, 6]  // north-east
//		];

//		var neighborhood = [
//            { xd: -1, yd:  0, offs: -1,   next: 7 }, // west
//            { xd: -1, yd: -1, offs: -w-1, next: 0 }, // north-west
//            { xd:  0, yd: -1, offs: -w,   next: 1 }, // north
//            { xd:  1, yd: -1, offs: -w+1, next: 2 }, // north-east
//            { xd:  1, yd:  0, offs:  1,   next: 3 }, // east
//            { xd:  1, yd:  1, offs:  w+1, next: 4 }, // south-east
//            { xd:  0, yd:  1, offs:  w,   next: 5 }, // south
//            { xd: -1, yd:  1, offs:  w-1, next: 6 }  // south-west
//		];

//		var neighborhood = [
//	        [-1,  0, -1,   7],
//	        [-3, -1, -w-3, 7],
//	        [-2, -1, -w-2, 1],
//	        [-1, -1, -w-1, 1],
//	        [ 1,  0,  1,   3],
//	        [ 3,  1,  w+3, 3],
//	        [ 2,  1,  w+2, 5],
//	        [ 1,  1,  w+1, 5]
//        ];
        var neighborhood = [

            { xd:  0, yd: -1, offs: -w, next: 3 },  // north
            { xd:  1, yd:  0, offs:  1, next: 0 }, // east
            { xd:  0, yd:  1, offs:  w, next: 1 }, // south
            { xd: -1, yd:  0, offs: -1, next: 2 } // west
        ];

        var prevIndex;
        var nextNeighbor = 0; // starting point for neighborhood search (index for neighborhood array)
        do {
            // go clockwise trough neighbors
            var index = this.offset4(point.x, point.y);
            this.pixels[index] = 0; // r
            this.pixels[index+2] = 0; // b
            var newPoint;
            var i = nextNeighbor;
            for(var j = 0; j < neighborhood.length; j++) {
                var nIndex = index + neighborhood[i].offs * 4;
                if(this.pixels[nIndex+1] == this.fColor && nIndex != prevIndex) {
                    newPoint = { x: point.x + neighborhood[i].xd, y: point.y + neighborhood[i].yd };
                    nextNeighbor = neighborhood[i].next;
                    break;
                }
                i++;
                i = i % neighborhood.length;
            }
            if(newPoint == undefined) {
                break;
            } else {
                point = newPoint;
                points.push(point);
            }

            prevIndex = index;
            numPoints++;

        } while(!(point.x == startPoint.x && point.y == startPoint.y) && numPoints < this.maxContourPoints );

        this.contour = points;
        //this.closeContour(points);
        /*var sol = this.getRandomPoint(points,3);
        this.test = sol;
        console.log(globalLost(points,sol));
        var sol = this.lossOptimization(points, sol, [ 50, 25, 10, 5, 2, 1]);
        console.log(globalLost(points,sol));
        sol = this.addPointOnMaximumLostSegment(points, sol);
        console.log(globalLost(points,sol));
        sol = this.lossOptimization(points, sol, [ 50, 25, 10, 5, 2, 1]);
        sol = this.lossOptimization(points, sol, [ 4, 3, 2, 1]);
        console.log(globalLost(points,sol));
        //sol = this.tryBalancing(points, sol);
        console.log(globalLost(points,sol));*/
        //this.findCorners(points);
        this.test = this.chenille(points);
        this.test.push(this.test[0]);

        console.log(this.test);

        return points;
    };




    /*

        Corners part

     */
    this.chenille = function (points) {
        var angles = [];

        for (var i=0; i<points.length;i++) {
            var angle = this.angle(points[i%points.length],points[(i+6)%points.length],points[(i+12)%points.length]);
            angles.push(angle);
        }

        var res = [];

        var auDessus = angles[0]>0.60?true:false;
        var tmp = [];
        var allTop = [];
        for (var i=1; i<angles.length;i++) {
            if (!auDessus){
                if (angles[i]>0.60){
                    tmp = [];
                    tmp.push(i);
                    auDessus = !auDessus;
                }
            }
            if (auDessus){
                if (angles[i]<0.60){
                    tmp.push(i);
                    allTop.push(tmp);
                    auDessus = !auDessus;
                }
            }

        }
        _.forEach(allTop, function (indexes){
            var max = angles[indexes[0]];
            var index = 0;
            for (var i=indexes[0];i<=indexes[1];i++){
                var tmp = angles[i];
                if (tmp>=max){
                    max=tmp;
                    index = i;
                }
            }
            res.push(points[index+6]);
        });

        console.log(res);
        return res;
    };

    this.angle = function (a, b , c) {

        var ux= a.x- b.x,
            uy= a.y- b.y,
            vx= b.x - c.x,
            vy= b.y - c.y

        var normU = Math.sqrt(ux*ux + uy*uy),
            normV = Math.sqrt(vx*vx + vy*vy);

        var uDotV = ux*vx+uy*vy;


        var cos = uDotV/(normU*normV);

        console.log(ux, uy, vx, vy, Math.acos(cos) || 0);

        if (ux===vx && uy===vy) {
            return 0;
        }
        return Math.acos(cos);
    };








    this.findCorners = function (points) {
        points.pop();
        var firstWall = this.getExtremities(points);
        console.log('firstwall : ',firstWall);
        //var solution = this.getRandomPoint(points, 3);
        var solution = firstWall;
        this.test = [];
        var self=this;
        _.forEach(solution, function (index) {
            //console.log(index);
            self.test.push(points[index]);

        });
        this.test.push(points[solution[0]]);
        return solution;
        /*solution = this.lossOptimization(points, solution, [ 50, 25, 10, 5, 2, 1]);
        var lost = globalLost(points,solution);
        console.log(lost);
        var i = 1;
        while (lost > 5 && i < 1) {
            solution = this.addPointOnMaximumLostSegment(points, solution);
            console.log(solution);
            console.log(globalLost(points,solution));
            solution = this.lossOptimization(points, solution, [ 50, 25, 10, 5, 2, 1]);
            console.log(globalLost(points,solution));
            solution = this.lossOptimization(points, solution, [ 4, 3, 2, 1]);
            lost = globalLost(points,solution);
            i+=1;
            console.log(solution);
            console.log(globalLost(points,solution));
        }

        return solution;*/
    };


    this.getRandomPoint = function (points, nb) {

        var res = [];
        for (var i=0;i<points.length;i=i+points.length/nb) {
            res.push(Math.round(i));
        }
        return res;
    }

    this.getExtremities = function (points) {
        var left, top, right, bottom;
        var iLeft, iTop, iRight, iBottom;
        var i=0;
        _.forEach(points, function (point) {
            // Left
            if (!left || (left.x >= point.x && left.y != point.y)) {
                left = point;
                iLeft = i;
            }
            else if (!right || (right.x < point.x && right.y != point.y)) {
                right = point;
                iRight = i;
            }
            else if (!top || (top.y > point.y && top.x != point.x)) {
                top = point;
                iTop = i;
            }
            else if (!bottom || (bottom.y < point.y && bottom.x != point.x)) {
                bottom = point;
                iBottom = i;
            }
            i++
        });
        console.log(iLeft,iTop,iRight, iBottom);
        return points.length > 0?[iLeft,iTop,iRight, iBottom]:[];
    };

    this.lossOptimization = function (points, solution, steps) {
        var c = globalLost(points, solution);
        var returnedSolution;
        var i= 0, k= 0, s=0;
        do {
            solution = improveSolution(points, solution, i, steps[s], c);
            c = globalLost(points, solution);
            i = (i+1) % solution.length;
            s = (s+1) % steps.length;
            k++;
            this.test = [];
            returnedSolution= [];
            var self=this;
            _.forEach(solution, function (index) {
                //console.log(index);
                self.test.push(points[index]);
                returnedSolution.push(index);
            });
            this.test.push(points[solution[0]]);
            //console.log(this.test);
        }while (k<1000)
        return returnedSolution;
    };

    this.addPointOnMaximumLostSegment = function (points, solution) {
        var lost = lostFunction(points, solution[0],solution[1]);
        var pair = 0;
        for (var i=1;i<solution.length;i++) {
            var tmp = lostFunction(points, solution[i], solution[(i+1)%solution.length]);
            if (tmp > lost) {
                pair = i;
                lost = tmp;
            }
        }


        var indice1 = solution[pair];
        var indice2 = solution[(pair+1)%solution.length];

        var distance;
        if (indice1<indice2) {
            distance = indice2-indice1;
        }
        else {
            distance = indice1-indice2;
        }
        console.log(distance);
        console.log('pair',pair);
        var indice = Math.round((solution[pair] + distance/2)%points.length);
        solution.push(indice);
        solution = _.sortBy(solution);

        this.test = [];
        var self=this;
        _.forEach(solution, function (index) {
            //console.log(index);
            self.test.push(points[index]);
        });
        this.test.push(points[solution[0]]);
        return solution;
    };

    this.tryBalancing = function (points, solution) {
        var lost = lostFunction(points, solution[0],solution[1]);
        var nSolution = solution;
        var pair = 0;
        for (var i=1;i<solution.length;i++) {
            var tmp = lostFunction(points, solution[i]+1, solution[(i+1)%solution.length-1]);
            if (tmp < lost) {
                nSolution[i] = nSolution[i] + 1;
                nSolution[(i+1)%solution.length-1]=nSolution[(i+1)%solution.length-1] -1;
                lost = tmp;
            }
            var tmp = lostFunction(points, solution[i]-1, solution[(i+1)%solution.length]+1);
            if (tmp < lost) {
                nSolution[i] = nSolution[i] - 1;
                nSolution[(i+1)%solution.length-1]=nSolution[(i+1)%solution.length-1] +1;
                lost = tmp;
            }
            var tmp = lostFunction(points, solution[i]+1, solution[(i+1)%solution.length]+1);
            if (tmp < lost) {
                nSolution[i] = nSolution[i] + 1;
                nSolution[(i+1)%solution.length-1]=nSolution[(i+1)%solution.length-1] +1;
                lost = tmp;
            }
            var tmp = lostFunction(points, solution[i]-1, solution[(i+1)%solution.length]-1);
            if (tmp < lost) {
                nSolution[i] = nSolution[i] - 1;
                nSolution[(i+1)%solution.length-1]=nSolution[(i+1)%solution.length-1] -1;
                lost = tmp;
            }
        }
        return nSolution;
    };



    this.findSegmentExtremities = function (points, p) {
        var first, last;
        var p1=p%points.length,p2=(p+1)%points.length,p3=(p+2)%points.length;
        var oldp1=p1,oldp2=p2,oldp3=p3;
        do {
            //console.log(points[p1],points[p2],points[p3]);
            var o = areAligned(points[p1],points[p2],points[p3]);

            //console.log(o);
            if (o) {
                first = o['p1'];
                last = o['p3'];
                oldp1=p1;
                oldp2=p2;
                oldp3=p3;
                p2=p3;
                p3=(p3+1)%points.length;
            }
            else {
                p1=oldp1;
                p2=oldp2;
                p3=oldp3;
            }

        }while(o);
        do {
            var o = areAligned(points[p1],points[p2],points[p3]);
            if (o) {
                first = o['p1'];
                last = o['p3'];
                oldp1=p1;
                oldp2=p2;
                oldp3=p3;
                p2=p1;
                p1=(p1-1+points.length)%points.length;
            }
            else {
                p1=oldp1;
                p2=oldp2;
                p3=oldp3;
            }

        }while(o);

        if (!first) {
            //console.log('error');
            return [points[oldp1],points[oldp2]];
        }

        return [first,last];
    }

    this.closeContour = function(points) {
        //console.log(points.length);
        var startPoint = points[0];
        points.pop();
        /*this.extremities = this.findSegmentExtremities(points, 0);
         do {
         var e = this.findSegmentExtremities(points, points.indexOf(this.extremities[this.extremities.length-1]));
         this.extremities.push(e[1]);
         }while(this.extremities[0] !== this.extremities[this.extremities.length-1]);
         //console.log(this.extremities);*/

        /*var G = 77;
         var a= G;
         var b = a+1;
         var arr = [a,b];
         var error=0;
         while(error <G){
         lostFunction(points, a, b)
         b=b+1;
         a=a-1;
         error = error +1;
         };
         //console.log(a,b);
         //console.log(points[a], points[b]);
         this.test = [points[a], points[b]];

         var a= 0;
         var b = 1;
         var errorMoyenne = lostFunction(points, a, b);
         while (true) {

         }*/
        this.findFirstWall(points);;
    };

    this.findFirstWall = function (points) {
        var permutations = [];
        for (var i=0;i<points.length;i++){
            for (var j=i+points.length/2;j<points.length;j++){
                var a= i;
                var b= Math.round(j);
                permutations.push({a:a,b:b});
            }
        }
        var min = lostFunction(points,permutations[0].a,permutations[0].b) || 1000;
        //console.log(min);
        var m = permutations[0];
        _.forEach(permutations, function (permutation) {

            var tmp = lostFunction(points, permutation.a, permutation.b)|| 1000;

            if (tmp/(permutation.b-permutation.a)<min/(m.b- m.a)) {
                min = tmp;
                m = permutation;
                //console.log(tmp);
            }
        });

        console.log(m);
        ////console.log('ok');
        return [m.a, m.b];

    }

    this.nextWall = function (points, solution, start, end) {
        var a = start;
        var b = end;
        var i=0;

        var solution = [ start, end, end+110, (end+220)%points.length];
        var c = globalLost(points, solution);

        var i= 0, k= 0, s=0;
        var steps = [ 5, 4, 3, 2, 1];
        do {
            //console.log('BEFORE : ', c);
            solution = improveSolution(points, solution, i, steps[s], c);
            c = globalLost(points, solution);
            //console.log('AFTER : ', c);
            i = (i+1) % solution.length;
            s = (s+1) % steps.length;
            k++;
            this.test = [];
            var self=this;
            _.forEach(solution, function (index) {
                //console.log(index);
                self.test.push(points[index]);
            });
            this.test.push(points[solution[0]]);
            //console.log(this.test);
        }while (k<1000)


        //var c = globalLost(points, [start-4, end+2, end+112, (end+264)%points.length]);


    };

    function improveSolution(points, solution, index, step, currentCost) {
        var cost = 0, bestCost=currentCost;
        var solutionClone = _.cloneDeep(solution);
        var bestSolution = _.cloneDeep(solution);
        var hasChanged = false;
        step = step * ((Math.random() - 0.5)>0?1:-1);
        do {
            //console.log('RANDOM');
            var a = Math.random();
            solutionClone[index] += step;
            solutionClone[index] = (solutionClone[index]+points.length)%points.length;

            cost = globalLost(points, solutionClone);
            if ( cost < bestCost) {
                hasChanged = true;
                bestCost=cost;
                bestSolution = _.cloneDeep(solutionClone);
            }
        }while ( cost <= bestCost);

        if (hasChanged) {
            return bestSolution;
        }
        return solution;
    }


    function globalLost (points, solution) {
        var cumul = 0;
        for (var i=0; i< solution.length;i++) {
            cumul += lostFunction(points, solution[i], solution[(i+1)%solution.length]);
        }
        return cumul;
    };

    function lostFunction(points, i1,i2, debug) {
        var p1 = points[i1%points.length];
        var p2 = points[i2%points.length];
        var dx = (p2.x-p1.x);
        var dy = (p2.y-p1.y);
        var cumulErreur = 0.0;
        var cpt = 0;
        if (dx === 0) {
            for (var i=i1+1;i!=i2;i=(i+1)%points.length){
                var p3 = points[i%points.length];
                var attendu = p3.x;
                var eu = p1.x;
                cumulErreur += Math.abs(attendu - eu);
                cpt = cpt+1;
            }

        }
        else if (dy===0) {
            for (var i=i1+1;i!=i2;i=(i+1)%points.length){
                var p3 = points[i%points.length];
                var attendu = p3.y;
                var eu = p1.y;
                cumulErreur += Math.abs(attendu - eu);
                cpt = cpt+1;

            }
        }
        else {
            var a = dy/dx;
            var b = p1.y - dy*p1.x/dx;
            var cumulErreur = 0.0;
            var cpt = 0;
            for (var i=i1+1;i!=i2;i=(i+1)%points.length){
                var p3 = points[i%points.length];
                var attendu = p3.y;
                var eu = (dy* p3.x/dx + b);
                cumulErreur += (eu - attendu)*(eu - attendu);
                cpt = cpt+1;
            }
            ////console.log('erreur moyenne : ', cumulErreur/cpt);


        }
        return cumulErreur/cpt;


    }

    function areAligned(p1, p2, p3) {

        var dx = (p3.x -p1.x)*1.0;
        var dy = (p3.y -p1.y)*1.0;
        var a,b;
        if (dy===0){
            return p2.y === p1.y ? {p1:p1, p3:p3}: undefined;
        }
        else if (dx===0){
            return p2.x === p1.x ? {p1:p1, p3:p3}: undefined;
        }

    }

    this.getPoints = function(points) {
        var log = "";
        for(var i=0;i<points.length;i++) {
            var point = points[i];
            log += point.x+","+point.y+" > ";
        }
        return log;
    }
}
